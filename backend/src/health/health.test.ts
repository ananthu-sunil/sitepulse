import { describe, expect, it } from "vitest";
import { calculateHealth } from "./health.js";
import type { Scan } from "../db/scans.js";

function createScan(overrides: Partial<Scan> = {},): Scan {
  return {
    id: 1,
    targetId: 1,
    statusCode: 200,
    responseTimeMs: 100,
    available: true,
    scannedAt: new Date("2026-01-01T12:00:00Z"),
    ...overrides,
  };
}

describe("calculateHealth", () => {
  it("returns unknown when there are no scans", () => {
    expect(calculateHealth([])).toEqual({
      status: "unknown",
      uptimePercentage: null,
      averageResponseTimeMs: null,
      consecutiveFailures: 0,
    });
  });

  it("returns up when the latest scan is available", () => {
    const scans = [
      createScan({
        id: 2,
        available: true,
        responseTimeMs: 120,
      }),
      createScan({
        id: 1,
        available: false,
        statusCode: null,
        error: "timeout",
        responseTimeMs: 5000,
      }),
    ];

    expect(calculateHealth(scans).status).toBe("up");
  });

  it("returns down when the latest scan is unavailable", () => {
    const scans = [
      createScan({
        id: 2,
        available: false,
        statusCode: null,
        error: "timeout",
        responseTimeMs: 5000,
      }),
      createScan({
        id: 1,
        available: true,
        responseTimeMs: 100,
      }),
    ];

    expect(calculateHealth(scans).status).toBe("down");
  });

  it("calculates uptime from available scans", () => {
    const scans = [
      createScan({ id: 3, available: true }),
      createScan({ id: 2, available: true }),
      createScan({
        id: 1,
        available: false,
        statusCode: null,
        error: "network_error",
      }),
    ];

    expect(calculateHealth(scans).uptimePercentage).toBeCloseTo(66.67, 2);
  });

  it("calculates average response time using available scans only", () => {
    const scans = [
      createScan({
        id: 3,
        available: true,
        responseTimeMs: 100,
      }),
      createScan({
        id: 2,
        available: false,
        statusCode: null,
        error: "timeout",
        responseTimeMs: 5000,
      }),
      createScan({
        id: 1,
        available: true,
        responseTimeMs: 300,
      }),
    ];

    expect(calculateHealth(scans).averageResponseTimeMs).toBe(200);
  });

  it("returns null average response time when every scan failed", () => {
    const scans = [
      createScan({
        id: 2,
        available: false,
        statusCode: null,
        error: "timeout",
        responseTimeMs: 5000,
      }),
      createScan({
        id: 1,
        available: false,
        statusCode: null,
        error: "network_error",
        responseTimeMs: 1000,
      }),
    ];

    expect(calculateHealth(scans).averageResponseTimeMs).toBeNull();
  });

  it("counts consecutive failures from the latest scan", () => {
    const scans = [
      createScan({
        id: 5,
        available: false,
        statusCode: null,
        error: "timeout",
      }),
      createScan({
        id: 4,
        available: false,
        statusCode: null,
        error: "network_error",
      }),
      createScan({
        id: 3,
        available: false,
        statusCode: null,
        error: "timeout",
      }),
      createScan({
        id: 2,
        available: true,
      }),
      createScan({
        id: 1,
        available: false,
        statusCode: null,
        error: "timeout",
      }),
    ];

    expect(calculateHealth(scans).consecutiveFailures).toBe(3);
  });

  it("returns zero consecutive failures when the latest scan is available", () => {
    const scans = [
      createScan({
        id: 3,
        available: true,
      }),
      createScan({
        id: 2,
        available: false,
        statusCode: null,
        error: "timeout",
      }),
      createScan({
        id: 1,
        available: false,
        statusCode: null,
        error: "network_error",
      }),
    ];

    expect(calculateHealth(scans).consecutiveFailures).toBe(0);
  });
});