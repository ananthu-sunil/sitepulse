import { Client, buildConnector } from "undici";
import { isIpAddress, isSafeIpAddress } from "./ip-safety.js";
import { resolveHostname } from "./resolve-host.js";

const MAX_REDIRECTS = 5;

export type SafeFetchOptions = {
  signal?: AbortSignal;
};

export type SafeFetchResponse = {
  statusCode: number;
  location: string | null;
};

export class SafeFetchError extends Error {
  constructor(
    public readonly code: "unsafe_target" | "network_error",
    message: string,
  ) {
    super(message);
    this.name = "SafeFetchError";
  }
}

function getValidatedAddress(url: URL): Promise<string> | string {
  if (isIpAddress(url.hostname)) {
    if (!isSafeIpAddress(url.hostname)) {
      throw new SafeFetchError(
        "unsafe_target",
        "Target resolves to an unsafe IP address",
      );
    }

    return url.hostname;
  }

  return resolveHostname(url.hostname).then((addresses) => {
    if (addresses.length === 0) {
      throw new SafeFetchError(
        "network_error",
        "Hostname resolved to no addresses",
      );
    }

    if (addresses.some((address) => !isSafeIpAddress(address))) {
      throw new SafeFetchError(
        "unsafe_target",
        "Target resolves to an unsafe IP address",
      );
    }

    return addresses[0];
  });
}

export function createValidatedConnector(
  ipAddress: string,
  connectorOptions: Parameters<typeof buildConnector>[0] = {},
) {
  const connector = buildConnector(connectorOptions);

  return (
    options: Parameters<typeof connector>[0],
    callback: Parameters<typeof connector>[1],
  ) => {
    connector(
      {
        ...options,
        hostname: ipAddress,
        servername: options.servername ?? options.hostname,
      },
      callback,
    );
  };
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "UND_ERR_ABORTED")
  );
}

async function requestValidatedUrl(
  target: URL,
  validatedAddress: string,
  signal?: AbortSignal,
): Promise<{
  statusCode: number;
  location: string | null;
}> {
  const client = new Client(target.origin, {
    connect: createValidatedConnector(validatedAddress),
  });

  try {
    const response = await client.request({
      path: `${target.pathname}${target.search}`,
      method: "GET",
      signal,
    });

    const location =
      typeof response.headers.location === "string"
        ? response.headers.location
        : null;

    await response.body.dump();

    return {
      statusCode: response.statusCode,
      location,
    };
  } catch (error) {
    if (error instanceof SafeFetchError) {
      throw error;
    }

    if (isAbortError(error)) {
      throw new DOMException("The operation was aborted", "AbortError");
    }

    throw new SafeFetchError("network_error", "Outbound request failed");
  } finally {
    if (signal?.aborted) {
      await client.destroy();
    } else {
      await client.close();
    }
  }
}

export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResponse> {
  let target: URL;

  try {
    target = new URL(url);
  } catch {
    throw new SafeFetchError("unsafe_target", "Invalid target URL");
  }

  for (let redirectCount = 0; ; redirectCount++) {
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      throw new SafeFetchError(
        "unsafe_target",
        "Only HTTP and HTTPS targets are allowed",
      );
    }

    let validatedAddress: string;

    try {
      validatedAddress = await getValidatedAddress(target);
    } catch (error) {
      if (error instanceof SafeFetchError) {
        throw error;
      }

      throw new SafeFetchError(
        "network_error",
        "Failed to resolve target hostname",
      );
    }

    const response = await requestValidatedUrl(
      target,
      validatedAddress,
      options.signal,
    );

    if (
      response.statusCode < 300 ||
      response.statusCode >= 400 ||
      response.location === null
    ) {
      return response;
    }

    if (redirectCount >= MAX_REDIRECTS) {
      throw new SafeFetchError(
        "network_error",
        "Maximum redirect limit exceeded",
      );
    }

    try {
      target = new URL(response.location, target);
    } catch {
      throw new SafeFetchError("network_error", "Invalid redirect location");
    }
  }
}
