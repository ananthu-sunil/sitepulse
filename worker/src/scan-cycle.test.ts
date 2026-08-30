import { beforeEach, describe, expect, it, vi } from "vitest";
import { listActiveMonitoredTargets } from "@sitepulse/backend/db/monitored-targets.js";
import { performScan } from "@sitepulse/backend/scanner/perform-scan.js";
import { runScanCycle } from "./scan-cycle.js";

vi.mock("@sitepulse/backend/db/monitored-targets.js", () => ({listActiveMonitoredTargets: vi.fn(),}));
vi.mock("@sitepulse/backend/scanner/perform-scan.js", () => ({performScan: vi.fn(),}));

const mockedListActiveMonitoredTargets = vi.mocked(listActiveMonitoredTargets);
const mockedPerformScan = vi.mocked(performScan);

describe("runScanCycle", () => {
  beforeEach(() => {vi.clearAllMocks();});

  it("scans all active targets", async () => {
    mockedListActiveMonitoredTargets.mockResolvedValue([
      {
        id: 1,
        url: "https://example.com",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        url: "https://example.org",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    mockedPerformScan.mockResolvedValue({} as never);

    const db = {} as never;

    await runScanCycle(db);

    expect(mockedListActiveMonitoredTargets).toHaveBeenCalledWith(db);
    expect(mockedPerformScan).toHaveBeenCalledTimes(2);
    expect(mockedPerformScan).toHaveBeenNthCalledWith(1, db, 1);
    expect(mockedPerformScan).toHaveBeenNthCalledWith(2, db, 2);
  });

  it("continues scanning when one target fails", async () => {
    mockedListActiveMonitoredTargets.mockResolvedValue([
      {
        id: 1,
        url: "https://example.com",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        url: "https://example.org",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    mockedPerformScan
      .mockRejectedValueOnce(new Error("Scan failed"))
      .mockResolvedValueOnce({} as never);

    const db = {} as never;
    await runScanCycle(db);

    expect(mockedPerformScan).toHaveBeenCalledTimes(2);
    expect(mockedPerformScan).toHaveBeenNthCalledWith(1, db, 1);
    expect(mockedPerformScan).toHaveBeenNthCalledWith(2, db, 2);
  });

  it("does nothing when there are no active targets", async () => {
    mockedListActiveMonitoredTargets.mockResolvedValue([]);
    const db = {} as never;
    await runScanCycle(db);

    expect(mockedPerformScan).not.toHaveBeenCalled();
  });
});