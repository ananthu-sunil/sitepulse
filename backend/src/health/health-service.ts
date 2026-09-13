import type { Pool } from "pg";
import {getLatestScan,getScansSince} from "../db/scan-history.js";
import { getMonitoredTargetById } from "../db/monitored-targets.js";
import {calculateHealth, type HealthSummary} from "./health.js";

export async function getHealth(
  db: Pool,
  targetId: number,
  since: Date,
): Promise<HealthSummary | null> {
  const target = await getMonitoredTargetById(db, targetId);

  if (!target) {
    return null;
  }

  const [latestScan, recentScans] = await Promise.all([
    getLatestScan(db, targetId),
    getScansSince(db, targetId, since),
  ]);

  return calculateHealth(latestScan, recentScans);
}