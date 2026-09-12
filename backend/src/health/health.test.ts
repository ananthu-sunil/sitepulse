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
  it("returns unknown when there is no latest scan", () => {
    expect(calculateHealth(null, [])).toEqual({
      status: "unknown",
      uptimePercentage: null,
      averageResponseTimeMs: null,
      consecutiveFailures: 0,
    });
  });

  it("returns up when the latest scan is available", () => {
    const latestScan = createScan({
      available: true,
    });

    const recentScans = [
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

    expect(calculateHealth(latestScan, recentScans).status,).toBe("up");
  });

  it("returns down when the latest scan is unavailable", () => {
    const latestScan = createScan({
      available: false,
      statusCode: null,
      error: "timeout",
      responseTimeMs: 5000,
    });

    const recentScans = [
      createScan({
        id: 2,
        available: true,
      }),
    ];

    expect(calculateHealth(latestScan, recentScans).status).toBe("down");
  });

  it("calculates uptime from recent scans", () => {
    const latestScan = createScan({
      available: true,
    });

    const recentScans = [
      createScan({ id: 3, available: true }),
      createScan({ id: 2, available: true }),
      createScan({
        id: 1,
        available: false,
        statusCode: null,
        error: "network_error",
      }),
    ];

    expect(calculateHealth(latestScan, recentScans).uptimePercentage).toBeCloseTo(66.67, 2);
  });

  it("calculates average response time using available scans only", () => {
    const latestScan = createScan({
      available: true,
    });

    const recentScans = [
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

    expect(calculateHealth(latestScan, recentScans).averageResponseTimeMs).toBe(200);
  });

  it("returns null average response time when all recent scans failed", () => {
    const latestScan = createScan({
      available: false,
      statusCode: null,
      error: "timeout",
    });

    const recentScans = [
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

    expect(
      calculateHealth(latestScan, recentScans).averageResponseTimeMs,).toBeNull();
  });

  it("counts consecutive failures from the newest recent scan", () => {
    const latestScan = createScan({
      available: false,
      statusCode: null,
      error: "timeout",
    });

    const recentScans = [
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

    expect(calculateHealth(latestScan, recentScans).consecutiveFailures).toBe(3);
  });

  it("returns zero consecutive failures when the newest recent scan is available", () => {
    const latestScan = createScan({
      available: true,
    });

    const recentScans = [
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

    expect(calculateHealth(latestScan, recentScans).consecutiveFailures).toBe(0);
  });

  it("returns current status with null metrics when there are no recent scans", () => {
    const latestScan = createScan({
      available: true,
    });

    expect(calculateHealth(latestScan, [])).toEqual({
      status: "up",
      uptimePercentage: null,
      averageResponseTimeMs: null,
      consecutiveFailures: 0,
    });
  });

  it("returns null average response time when there are no available recent scans", () => {
    const latestScan = createScan({
      available: false,
      statusCode: null,
      error: "network_error",
    });

    const recentScans = [
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
        responseTimeMs: 3000,
      }),
    ];

    const health = calculateHealth(
      latestScan,
      recentScans,
    );

    expect(health.status).toBe("down");
    expect(health.uptimePercentage).toBe(0);
    expect(health.averageResponseTimeMs).toBeNull();
    expect(health.consecutiveFailures).toBe(2);
  });
});