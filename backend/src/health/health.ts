import type { Scan } from "../db/scans.js";
export type HealthStatus = "up" | "down" | "unknown";
export type HealthSummary = {
  status: HealthStatus;
  uptimePercentage: number | null;
  averageResponseTimeMs: number | null;
  consecutiveFailures: number;
};

export function calculateHealth(latestScan: Scan | null,recentScans: Scan[]): HealthSummary {
  if (!latestScan) {
    return {
      status: "unknown",
      uptimePercentage: null,
      averageResponseTimeMs: null,
      consecutiveFailures: 0,
    };
  }

  if (recentScans.length === 0) {
    return {
      status: latestScan.available ? "up" : "down",
      uptimePercentage: null,
      averageResponseTimeMs: null,
      consecutiveFailures: 0,
    };
  }

  const availableScans = recentScans.filter(
    (scan) => scan.available,
  );

  const uptimePercentage = (availableScans.length / recentScans.length) * 100;

  const averageResponseTimeMs =
    availableScans.length > 0
      ? availableScans.reduce(
          (total, scan) => total + scan.responseTimeMs,
          0,
        ) / availableScans.length
      : null;

  let consecutiveFailures = 0;

  for (const scan of recentScans) {
    if (scan.available) {
      break;
    }

    consecutiveFailures++;
  }

  return {
    status: latestScan.available ? "up" : "down",
    uptimePercentage,
    averageResponseTimeMs,
    consecutiveFailures,
  };
}