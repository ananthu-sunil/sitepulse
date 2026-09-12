import type { Pool } from "pg";
import {getLatestScan,getScansSince} from "../db/scan-history.js";
import {calculateHealth, type HealthSummary} from "./health.js";

export async function getHealth(
  db: Pool,
  targetId: number,
  since: Date,
): Promise<HealthSummary> {
  const [latestScan, recentScans] = await Promise.all([
    getLatestScan(db, targetId),
    getScansSince(db, targetId, since),
  ]);

  return calculateHealth(latestScan, recentScans);
}