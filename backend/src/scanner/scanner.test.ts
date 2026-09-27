import { afterEach, describe, expect, it, vi } from "vitest";
import { scanTarget } from "./scanner.js";
import { SafeFetchError, safeFetch } from "../network/safe-fetch.js";

vi.mock("../network/safe-fetch.js", () => ({
  safeFetch: vi.fn(),
  SafeFetchError: class SafeFetchError extends Error {
    constructor(
      public readonly code: "unsafe_target" | "network_error",
      message: string,
    ) {
      super(message);
      this.name = "SafeFetchError";
    }
  },
}));

const mockedSafeFetch = vi.mocked(safeFetch);

describe("scanTarget", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    mockedSafeFetch.mockReset();
  });

  it("returns an available result for a successful response", async () => {
    mockedSafeFetch.mockResolvedValue({
      statusCode: 200,
      location: null,
    });

    const result = await scanTarget("https://example.com");

    expect(result.statusCode).toBe(200);
    expect(result.responseTimeMs).toEqual(expect.any(Number));
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.available).toBe(true);

    expect(mockedSafeFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("marks a non-successful HTTP response as unavailable", async () => {
    mockedSafeFetch.mockResolvedValue({
      statusCode: 500,
      location: null,
    });

    const result = await scanTarget("https://example.com");

    expect(result.statusCode).toBe(500);
    expect(result.available).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it("returns a timeout result when the request times out", async () => {
    mockedSafeFetch.mockRejectedValue(
      new DOMException("The operation was aborted", "AbortError"),
    );

    const result = await scanTarget("https://example.com");

    expect(result).toMatchObject({
      statusCode: null,
      available: false,
      error: "timeout",
    });
  });

  it("returns unsafe_target when safeFetch rejects an unsafe target", async () => {
    mockedSafeFetch.mockRejectedValue(
      new SafeFetchError(
        "unsafe_target",
        "Target resolves to an unsafe IP address",
      ),
    );

    const result = await scanTarget("https://example.com");

    expect(result).toMatchObject({
      statusCode: null,
      available: false,
      error: "unsafe_target",
    });
  });

  it("returns network_error when safeFetch encounters a network error", async () => {
    mockedSafeFetch.mockRejectedValue(
      new SafeFetchError("network_error", "Outbound request failed"),
    );

    const result = await scanTarget("https://example.com");

    expect(result).toMatchObject({
      statusCode: null,
      available: false,
      error: "network_error",
    });
  });

  it("returns network_error for an unexpected error", async () => {
    mockedSafeFetch.mockRejectedValue(new Error("Unexpected failure"));

    const result = await scanTarget("https://example.com");

    expect(result).toMatchObject({
      statusCode: null,
      available: false,
      error: "network_error",
    });
  });
});
