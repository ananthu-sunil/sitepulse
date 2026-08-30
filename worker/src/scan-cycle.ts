import type { Pool } from "pg";
import { listActiveMonitoredTargets } from "@sitepulse/backend/db/monitored-targets.js";
import { performScan } from "@sitepulse/backend/scanner/perform-scan.js";

export async function runScanCycle(db: Pool): Promise<void> {
  const targets = await listActiveMonitoredTargets(db);

  for (const target of targets) {
    try {
      await performScan(db, target.id);
    } catch (error) {
      console.error(`Scan failed for target ${target.id}:`, error);
    }
  }
}