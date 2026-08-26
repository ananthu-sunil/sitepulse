import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "./client.js";
import { createMonitoredTarget } from "./monitored-targets.js";

describe("Monitored targets", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM monitored_targets");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("creates a monitored target", async () => {
    const target = await createMonitoredTarget("https://example.com");

    expect(target.url).toBe("https://example.com");
    expect(target.active).toBe(true);
    expect(target.id).toEqual(expect.any(Number));
    expect(target.createdAt).toBeInstanceOf(Date);
    expect(target.updatedAt).toBeInstanceOf(Date);
  });

  it("prevents duplicate URLs", async () => {
    await createMonitoredTarget("https://example.com");

    await expect(
      createMonitoredTarget("https://example.com")
    ).rejects.toThrow();
  });
});