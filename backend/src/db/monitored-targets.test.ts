import { afterAll, beforeEach, describe, expect, it } from "vitest";
import  { testPool } from "./test-client.js";
import { createMonitoredTarget, listMonitoredTargets, listActiveMonitoredTargets, getMonitoredTargetById, updateMonitoredTarget } from "./monitored-targets.js";

describe("Monitored targets", () => {
  beforeEach(async () => {await testPool.query("DELETE FROM scans"); await testPool.query("DELETE FROM monitored_targets");});
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

  it("returns only active monitored targets", async () => {
  const activeTarget = await createMonitoredTarget(testPool, "https://active.example.com",);
  const inactiveTarget = await createMonitoredTarget(testPool, "https://inactive.example.com",);
  await updateMonitoredTarget(testPool, inactiveTarget.id, false);
  const targets = await listActiveMonitoredTargets(testPool);

  expect(targets).toHaveLength(1);
  expect(targets[0]).toMatchObject({
    id: activeTarget.id,
    url: "https://active.example.com",
    active: true,
    });
  });

  it("returns an empty array when no active targets exist", async () => {
    const target = await createMonitoredTarget(testPool, "https://inactive.example.com",);
    await updateMonitoredTarget(testPool, target.id, false);
    const targets = await listActiveMonitoredTargets(testPool);

    expect(targets).toEqual([]);
  });

  it("returns all active monitored targets", async () => {
    await createMonitoredTarget(testPool, "https://one.example.com",);
    await createMonitoredTarget(testPool, "https://two.example.com",);
    const inactiveTarget = await createMonitoredTarget(testPool, "https://three.example.com",);
    await updateMonitoredTarget(testPool, inactiveTarget.id, false);
    const targets = await listActiveMonitoredTargets(testPool);

    expect(targets).toHaveLength(2);
    expect(targets.map((target) => target.url)).toEqual(
      expect.arrayContaining([
        "https://one.example.com",
        "https://two.example.com",
      ]),
    );
  });

});