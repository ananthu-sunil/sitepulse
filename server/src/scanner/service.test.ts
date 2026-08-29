import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { testPool } from "../db/test-client.js";
import { createMonitoredTarget } from "../db/monitored-targets.js";
import { performScan } from "./service.js";
import { scanTarget } from "./scanner.js";

const mockedScanTarget = vi.mocked(scanTarget);

vi.mock("./scanner.js", () => ({scanTarget: vi.fn(),}));

describe("performScan", () => {
  beforeEach(async () => {await testPool.query("DELETE FROM scans");await testPool.query("DELETE FROM monitored_targets");vi.clearAllMocks();});
  afterAll(async () => {await testPool.end();});

  it("scans an active target and persists the result", async () => {
    const target = await createMonitoredTarget(testPool, "https://example.com",);

    mockedScanTarget.mockResolvedValue({
      statusCode: 200,
      responseTimeMs: 120,
      available: true,
    });

    const scan = await performScan(testPool, target.id);

    expect(mockedScanTarget).toHaveBeenCalledWith("https://example.com",);
    expect(scan.targetId).toBe(target.id);
    expect(scan.statusCode).toBe(200);
    expect(scan.responseTimeMs).toBe(120);
    expect(scan.available).toBe(true);
  });

  it("does not scan an inactive target", async () => {
    const target = await createMonitoredTarget(testPool, "https://example.com",);
    await testPool.query("UPDATE monitored_targets SET active = false WHERE id = $1",[target.id],);

    await expect(performScan(testPool, target.id),).rejects.toThrow("Target is inactive");
    expect(mockedScanTarget).not.toHaveBeenCalled();
  });

  it("rejects a missing target", async () => {
    await expect(performScan(testPool, 999999),).rejects.toThrow("Target not found");

    expect(mockedScanTarget).not.toHaveBeenCalled();
  });

});

