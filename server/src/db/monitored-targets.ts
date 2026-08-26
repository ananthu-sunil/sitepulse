import { pool } from "./client.js";

export type MonitoredTarget = {
  id: number;
  url: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MonitoredTargetRow = {
  id: number;
  url: string;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

function mapRow(row: MonitoredTargetRow): MonitoredTarget {
  return {
    id: row.id,
    url: row.url,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createMonitoredTarget(
  url: string
): Promise<MonitoredTarget> {
  const result = await pool.query<MonitoredTargetRow>(
    `
      INSERT INTO monitored_targets (url)
      VALUES ($1)
      RETURNING id, url, active, created_at, updated_at
    `,
    [url]
  );

  return mapRow(result.rows[0]);
}