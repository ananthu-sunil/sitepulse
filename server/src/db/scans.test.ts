import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testPool } from "./test-client.js";
import { recordScan } from "./scans.js";

afterAll(async () => {await testPool.end();});

describe("Scans", () => {
  beforeEach(async () => {await testPool.query("DELETE FROM scans"); await testPool.query("DELETE FROM monitored_targets");});

  it("records a successful scan", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ($1)
        RETURNING id
      `,
      ["https://example.com"],
    );

    const scan = await recordScan(testPool, target.rows[0].id, {
      statusCode: 200,
      responseTimeMs: 143,
      available: true,
    });

    expect(scan.targetId).toBe(target.rows[0].id);
    expect(scan.statusCode).toBe(200);
    expect(scan.responseTimeMs).toBe(143);
    expect(scan.available).toBe(true);
    expect(scan.error).toBeUndefined();
    expect(scan.scannedAt).toBeInstanceOf(Date);
  });

  it("records a timeout scan without an HTTP status", async () => {
    const target = await testPool.query<{ id: number }>(
      `
        INSERT INTO monitored_targets (url)
        VALUES ($1)
        RETURNING id
      `,
      ["https://example.com"],
    );

    const scan = await recordScan(testPool, target.rows[0].id, {
      statusCode: null,
      responseTimeMs: 5000,
      available: false,
      error: "timeout",
    });

    expect(scan.statusCode).toBeNull();
    expect(scan.responseTimeMs).toBe(5000);
    expect(scan.available).toBe(false);
    expect(scan.error).toBe("timeout");
  });
});