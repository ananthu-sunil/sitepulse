import { Pool } from "pg";
import type { ScanResult } from "../scanner/scanner.js";

type ScanRow = {
  id: number;
  target_id: number;
  status_code: number | null;
  response_time_ms: number;
  available: boolean;
  error: "timeout" | "network_error" | null;
  scanned_at: Date;
};

export type Scan = {
  id: number;
  targetId: number;
  statusCode: number | null;
  responseTimeMs: number;
  available: boolean;
  error?: "timeout" | "network_error";
  scannedAt: Date;
};

function mapRow(row: ScanRow): Scan {
  return {
    id: row.id,
    targetId: row.target_id,
    statusCode: row.status_code,
    responseTimeMs: row.response_time_ms,
    available: row.available,
    ...(row.error ? { error: row.error } : {}),
    scannedAt: row.scanned_at,
  };
}

export async function recordScan(db: Pool, targetId: number, result: ScanResult,): Promise<Scan> {
  const queryResult = await db.query<ScanRow>(
    `
      INSERT INTO scans (
        target_id,
        status_code,
        response_time_ms, 
        available,
        error
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        target_id,
        status_code,
        response_time_ms,
        available,
        error,
        scanned_at
    `,
    [
      targetId,
      result.statusCode,
      result.responseTimeMs,
      result.available,
      result.error ?? null,
    ],
  );

  return mapRow(queryResult.rows[0]);
}
