import type { Pool } from "pg";

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
  db : Pool,
  url: string
): Promise<MonitoredTarget> {
  const result = await db.query<MonitoredTargetRow>(
    `
      INSERT INTO monitored_targets (url)
      VALUES ($1)
      RETURNING id, url, active, created_at, updated_at
    `,
    [url]
  );

  return mapRow(result.rows[0]);
}

export async function listMonitoredTargets(db: Pool): Promise<MonitoredTarget[]> {
  const result = await db.query<MonitoredTargetRow>(
    `
      SELECT id, url, active, created_at, updated_at
      FROM monitored_targets
      ORDER BY created_at DESC
    `
  );

  return result.rows.map(mapRow);
}

export async function getMonitoredTargetById(
  db: Pool,
  id: number
): Promise<MonitoredTarget | null> {
  const result = await db.query<MonitoredTargetRow>(
    `
      SELECT id, url, active, created_at, updated_at
      FROM monitored_targets
      WHERE id = $1
    `,
    [id]
  );

  const row = result.rows[0];
  return row ? mapRow(row) : null;
}