import type { Pool } from "pg";
import { mapRow, type Scan, type ScanRow } from "./scans.js";

export async function getLatestScan(db: Pool, targetId: number): Promise<Scan | null> {
  const result = await db.query<ScanRow>(
    `
      SELECT
        id,
        target_id,
        status_code,
        response_time_ms,
        available,
        error,
        scanned_at
      FROM scans
      WHERE target_id = $1
      ORDER BY scanned_at DESC, id DESC
      LIMIT 1
    `,
    [targetId],
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function listScans(db: Pool, targetId: number, limit: number): Promise<Scan[]> {
  const result = await db.query<ScanRow>(
    `
      SELECT
        id,
        target_id,
        status_code,
        response_time_ms,
        available,
        error,
        scanned_at
      FROM scans
      WHERE target_id = $1
      ORDER BY scanned_at DESC, id DESC
      LIMIT $2
    `,
    [targetId, limit],
  );
  return result.rows.map(mapRow);
}