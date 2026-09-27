import { Client, buildConnector } from "undici";
import { isIpAddress, isSafeIpAddress } from "./ip-safety.js";
import { resolveHostname } from "./resolve-host.js";

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

export function createValidatedConnector(ipAddress: string) {
  const connector = buildConnector({});

  return (
    options: Parameters<typeof connector>[0],
    callback: Parameters<typeof connector>[1],
  ) => {
    connector(
      {
        ...options,
        hostname: ipAddress,
      },
      callback,
    );
  };
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

  const client = new Client(target.origin, {
    connect: createValidatedConnector(validatedAddress),
  });

  try {
    const response = await client.request({
      path: `${target.pathname}${target.search}`,
      method: "GET",
      signal: options.signal,
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

    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new SafeFetchError(
      "network_error",
      "Outbound request failed",
    );
  } finally {
    await client.close();
  }
}