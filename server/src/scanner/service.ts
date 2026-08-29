import type { Pool } from "pg";
import { getMonitoredTargetById } from "../db/monitored-targets.js";
import { recordScan } from "../db/scans.js";
import { scanTarget } from "./scanner.js";

export async function performScan(db: Pool, targetId: number) {
  const target = await getMonitoredTargetById(db, targetId);

  if (!target) {
    throw new Error("Target not found");
  }

  if (!target.active) {
    throw new Error("Target is inactive");
  }

  const result = await scanTarget(target.url);
  return recordScan(db, target.id, result);
}