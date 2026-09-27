import { SafeFetchError, safeFetch } from "../network/safe-fetch.js";

export type ScanError = "timeout" | "network_error" | "unsafe_target";

export type ScanResult = {
  statusCode: number | null;
  responseTimeMs: number;
  available: boolean;
  error?: ScanError;
};

export async function scanTarget(
  url: string,
  timeoutMs = 5000,
): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const response = await safeFetch(url, {
      signal: controller.signal,
    });

    return {
      statusCode: response.statusCode,
      responseTimeMs: Math.round(performance.now() - start),
      available: response.statusCode >= 200 && response.statusCode < 300,
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

    if (error instanceof SafeFetchError) {
      return {
        statusCode: null,
        responseTimeMs,
        available: false,
        error: error.code,
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
