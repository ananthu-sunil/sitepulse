import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { getHealth } from "./health-service.js";
import { testPool } from "../db/test-database.js";

beforeEach(async () => {
  await testPool.query("DELETE FROM scans");
  await testPool.query("DELETE FROM monitored_targets");
});

afterAll(async () => {
  await testPool.end();
});

describe("getHealth", () => {
  it("returns unknown when the target has no scans", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ('https://example.com/health-service-empty')
        RETURNING id
      `,
    );

    const targetId = target.rows[0].id;
    const since = new Date("2026-01-01T00:00:00.000Z");
    const health = await getHealth(testPool, targetId, since);

    expect(health).toEqual({
      status: "unknown",
      uptimePercentage: null,
      averageResponseTimeMs: null,
      consecutiveFailures: 0,
    });
  });

  it("uses the latest scan for current status and recent scans for metrics", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ('https://example.com/health-service-metrics')
        RETURNING id
      `,
    );

    const targetId = target.rows[0].id;
    await testPool.query(
      `
        INSERT INTO scans (
          target_id,
          status_code,
          response_time_ms,
          available,
          scanned_at
        )
        VALUES
          ($1, 200, 100, true,  '2026-01-01T00:00:00.000Z'),
          ($1, 500, 300, false, '2026-01-02T00:00:00.000Z'),
          ($1, 200, 200, true,  '2026-01-03T00:00:00.000Z')
      `,
      [targetId],
    );

    const since = new Date("2026-01-02T00:00:00.000Z");
    const health = await getHealth(testPool, targetId, since);

    expect(health).toEqual({
      status: "up",
      uptimePercentage: 50,
      averageResponseTimeMs: 200,
      consecutiveFailures: 0,
    });
  });

  it("excludes scans older than the requested window from metrics", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ('https://example.com/health-service-window')
        RETURNING id
      `,
    );

    const targetId = target.rows[0].id;
    await testPool.query(
      `
        INSERT INTO scans (
          target_id,
          status_code,
          response_time_ms,
          available,
          scanned_at
        )
        VALUES
          ($1, 200, 50,  true, '2025-12-31T00:00:00.000Z'),
          ($1, 500, 300, false, '2026-01-02T00:00:00.000Z')
      `,
      [targetId],
    );

    const since = new Date("2026-01-01T00:00:00.000Z");
    const health = await getHealth(testPool, targetId, since);

    expect(health).toEqual({
      status: "down",
      uptimePercentage: 0,
      averageResponseTimeMs: null,
      consecutiveFailures: 1,
    });
  });

  it("counts consecutive failures from the newest recent scan", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ('https://example.com/health-service-failures')
        RETURNING id
      `,
    );

    const targetId = target.rows[0].id;
    await testPool.query(
      `
        INSERT INTO scans (
          target_id,
          status_code,
          response_time_ms,
          available,
          scanned_at
        )
        VALUES
          ($1, 500, 100, false, '2026-01-01T00:00:00.000Z'),
          ($1, 503, 150, false, '2026-01-02T00:00:00.000Z'),
          ($1, 200, 200, true,  '2026-01-03T00:00:00.000Z')
      `,
      [targetId],
    );

    const since = new Date("2026-01-01T00:00:00.000Z");
    const health = await getHealth(testPool, targetId, since);

    expect(health.status).toBe("up");
    expect(health.consecutiveFailures).toBe(0);
    expect(health.uptimePercentage).toBeCloseTo(33.3333333333);
    expect(health.averageResponseTimeMs).toBe(200);
  });

  it("uses the newest scan when multiple scans have the same timestamp", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ('https://example.com/health-service-ordering')
        RETURNING id
      `,
    );

    const targetId = target.rows[0].id;
    const scannedAt = "2026-01-03T00:00:00.000Z";

    await testPool.query(
      `
        INSERT INTO scans (
          target_id,
          status_code,
          response_time_ms,
          available,
          scanned_at
        )
        VALUES
          ($1, 500, 100, false, $2),
          ($1, 200, 200, true,  $2)
      `,
      [targetId, scannedAt],
    );

    const since = new Date("2026-01-01T00:00:00.000Z");
    const health = await getHealth(testPool, targetId, since);

    expect(health.status).toBe("up");
    expect(health.consecutiveFailures).toBe(0);
  });
});