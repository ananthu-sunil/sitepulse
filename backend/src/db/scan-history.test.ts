import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testPool } from "./test-client.js";
import { getLatestScan, listScans } from "./scan-history.js";

afterAll(async () => {
  await testPool.end();
});

describe("Scan history", () => {
  beforeEach(async () => {
    await testPool.query("DELETE FROM scans");
    await testPool.query("DELETE FROM monitored_targets");
  });

  it("returns the latest scan for a target", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ($1)
        RETURNING id
      `,
      ["https://example.com"],
    );

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
          ($1, 200, 100, true, NOW() - INTERVAL '10 minutes'),
          ($1, 200, 200, true, NOW())
      `,
      [target.rows[0].id],
    );

    const scan = await getLatestScan(testPool, target.rows[0].id);

    expect(scan).not.toBeNull();
    expect(scan?.targetId).toBe(target.rows[0].id);
    expect(scan?.statusCode).toBe(200);
    expect(scan?.responseTimeMs).toBe(200);
    expect(scan?.available).toBe(true);
  });

  it("returns null when a target has no scans", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ($1)
        RETURNING id
      `,
      ["https://example.com"],
    );

    const scan = await getLatestScan(testPool, target.rows[0].id);

    expect(scan).toBeNull();
  });

  it("returns scans newest-first", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ($1)
        RETURNING id
      `,
      ["https://example.com"],
    );

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
          ($1, 200, 100, true, NOW() - INTERVAL '20 minutes'),
          ($1, 200, 200, true, NOW() - INTERVAL '10 minutes'),
          ($1, 500, 300, false, NOW())
      `,
      [target.rows[0].id],
    );

    const scans = await listScans(testPool, target.rows[0].id, 10);

    expect(scans).toHaveLength(3);
    expect(scans[0].responseTimeMs).toBe(300);
    expect(scans[1].responseTimeMs).toBe(200);
    expect(scans[2].responseTimeMs).toBe(100);
  });

  it("respects the requested limit", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ($1)
        RETURNING id
      `,
      ["https://example.com"],
    );

    await testPool.query(
      `
        INSERT INTO scans (
          target_id,
          status_code,
          response_time_ms,
          available
        )
        VALUES
          ($1, 200, 100, true),
          ($1, 200, 200, true),
          ($1, 200, 300, true)
      `,
      [target.rows[0].id],
    );

    const scans = await listScans(testPool, target.rows[0].id, 2);

    expect(scans).toHaveLength(2);
  });

  it("only returns scans belonging to the requested target", async () => {
    const targets = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ($1), ($2)
        RETURNING id
      `,
      ["https://example.com", "https://example.org"],
    );

    await testPool.query(
      `
        INSERT INTO scans (
          target_id,
          status_code,
          response_time_ms,
          available
        )
        VALUES
          ($1, 200, 100, true),
          ($2, 500, 500, false)
      `,
      [targets.rows[0].id, targets.rows[1].id],
    );

    const scans = await listScans(testPool, targets.rows[0].id, 10);

    expect(scans).toHaveLength(1);
    expect(scans[0].targetId).toBe(targets.rows[0].id);
  });

  it("returns an empty array when a target has no scans", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ($1)
        RETURNING id
      `,
      ["https://example.com"],
    );

    const scans = await listScans(testPool, target.rows[0].id, 10);

    expect(scans).toEqual([]);
  });
});