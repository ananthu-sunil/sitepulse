export type ScanResult = {
  statusCode: number | null;
  responseTimeMs: number;
  available: boolean;
  error?: "timeout" | "network_error";
};

export async function scanTarget(url: string, timeoutMs = 5000,): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();

  try {
    const response = await fetch(url, {signal: controller.signal,});
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