import { afterEach, describe, expect, it, vi } from "vitest";
import { scanTarget } from "./scanner.js";

describe("scanTarget", () => {
  afterEach(() => {vi.restoreAllMocks();});

  it("returns an available result for a successful response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }),);
    const result = await scanTarget("https://example.com");

    expect(result.statusCode).toBe(200);
    expect(result.responseTimeMs).toEqual(expect.any(Number));
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.available).toBe(true);
  });

  it("marks a non-successful HTTP response as unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }),);
    const result = await scanTarget("https://example.com");

    expect(result.statusCode).toBe(500);
    expect(result.available).toBe(false);
  });

  it("returns a timeout result when the request times out", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("The operation was aborted", "AbortError"),);
    const result = await scanTarget("https://example.com", 5000);

    expect(result).toMatchObject({statusCode: null, available: false, error: "timeout",});
  });

  it("returns a network error result when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"),);
    const result = await scanTarget("https://example.com");
    
    expect(result).toMatchObject({statusCode: null, available: false, error: "network_error",});
  });

});