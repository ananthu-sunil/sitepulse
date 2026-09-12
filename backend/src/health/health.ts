import type { Scan } from "../db/scans.js";
export type HealthStatus = "up" | "down" | "unknown";
export type HealthSummary = {
  status: HealthStatus;
  uptimePercentage: number | null;
  averageResponseTimeMs: number | null;
  consecutiveFailures: number;
};

export function calculateHealth(scans: Scan[]): HealthSummary {
  if (scans.length === 0) {
    return {
      status: "unknown",
      uptimePercentage: null,
      averageResponseTimeMs: null,
      consecutiveFailures: 0,
    };
  }

  const latestScan = scans[0];
  const availableScans = scans.filter((scan) => scan.available);
  const uptimePercentage = (availableScans.length / scans.length) * 100;

  const averageResponseTimeMs =
    availableScans.reduce(
      (total, scan) => total + scan.responseTimeMs,
      0,
    ) / availableScans.length;

  let consecutiveFailures = 0;

  for (const scan of scans) {
    if (scan.available) {
      break;
    }
    consecutiveFailures++;
  }

  return {
    status: latestScan.available ? "up" : "down",
    uptimePercentage,
    averageResponseTimeMs:
      availableScans.length > 0 ? averageResponseTimeMs : null,
    consecutiveFailures,
  };
}