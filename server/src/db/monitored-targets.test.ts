import { afterAll, beforeEach, describe, expect, it } from "vitest";
import  { testPool } from "./test-client.js";
import { createMonitoredTarget, listMonitoredTargets, getMonitoredTargetById } from "./monitored-targets.js";

describe("Monitored targets", () => {
  beforeEach(async () => {await testPool.query("DELETE FROM monitored_targets");});
  afterAll(async () => {await testPool.end();});

  it("creates a monitored target", async () => {
    const target = await createMonitoredTarget(testPool,"https://example.com");

    expect(target.url).toBe("https://example.com");
    expect(target.active).toBe(true);
    expect(target.id).toEqual(expect.any(Number));
    expect(target.createdAt).toBeInstanceOf(Date);
    expect(target.updatedAt).toBeInstanceOf(Date);
  });

  it("prevents duplicate URLs", async () => {
    await createMonitoredTarget(testPool,"https://example.com");
    await expect(createMonitoredTarget(testPool,"https://example.com")).rejects.toThrow();
  });

    it("lists monitored targets", async () => {
    const first = await createMonitoredTarget(testPool,"https://example.com");
    const second = await createMonitoredTarget(testPool,"https://example.org");

    const targets = await listMonitoredTargets(testPool);

    expect(targets).toHaveLength(2);
    expect(targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({id: first.id,url: "https://example.com",active: true,}),
        expect.objectContaining({id: second.id,url: "https://example.org",active: true,}),
      ])
    );
  });

  it("gets a monitored target by id", async () => {
    const created = await createMonitoredTarget(testPool,"https://example.com");
    const target = await getMonitoredTargetById(testPool,created.id);

    expect(target).toMatchObject({id: created.id,url: "https://example.com",active: true,});
  });

  it("returns null when a monitored target does not exist", async () => {
    const target = await getMonitoredTargetById(testPool,999999);
    expect(target).toBeNull();
  });
});