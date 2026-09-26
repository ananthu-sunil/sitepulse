import { isIpAddress, isSafeIpAddress } from "../network/ip-safety.js";
import { resolveHostname } from "../network/resolve-host.js";

export type ScanError = "timeout" | "network_error" | "unsafe_target";

export type ScanResult = {
  statusCode: number | null;
  responseTimeMs: number;
  available: boolean;
  error?: ScanError;
};

export async function scanTarget(url: string, timeoutMs = 5000): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const target = new URL(url);

    if (isIpAddress(target.hostname)) {
      if (!isSafeIpAddress(target.hostname)) {
        return {
          statusCode: null,
          responseTimeMs: Math.round(performance.now() - start),
          available: false,
          error: "unsafe_target",
        };
      }
    } else {
      const addresses = await resolveHostname(target.hostname);

      if (addresses.some((address) => !isSafeIpAddress(address))) {
        return {
          statusCode: null,
          responseTimeMs: Math.round(performance.now() - start),
          available: false,
          error: "unsafe_target",
        };
      }
    }

    const response = await fetch(url, {
      signal: controller.signal,
    });

    return {
      statusCode: response.status,
      responseTimeMs: Math.round(performance.now() - start),
      available: response.ok,
    };
    
  } catch (error) {
    const responseTimeMs = Math.round(performance.now() - start);

    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        statusCode: null,
        responseTimeMs,
        available: false,
        error: "timeout",
      };
    }
    return {
      statusCode: null,
      responseTimeMs,
      available: false,
      error: "network_error",
    };
  } finally {
    clearTimeout(timeout);
  }
}
