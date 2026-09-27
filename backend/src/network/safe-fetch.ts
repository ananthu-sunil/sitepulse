import { isIpAddress, isSafeIpAddress } from "./ip-safety.js";
import { resolveHostname } from "./resolve-host.js";
import { Client, buildConnector } from "undici";

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
    if (addresses.some((address) => !isSafeIpAddress(address))) {
      throw new SafeFetchError(
        "unsafe_target",
        "Target resolves to an unsafe IP address",
      );
    }

    return addresses[0];
  });
}

function createConnector(ipAddress: string) {
  const connector = buildConnector();

  return connector.connect({
    hostname: ipAddress,
  });
}

export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResponse> {
  throw new Error("Not implemented");
}