import { describe, expect, it, vi } from "vitest";
import { resolveHostname } from "./resolve-host.js";

const { mockedLookup } = vi.hoisted(() => ({
  mockedLookup: vi.fn<
    (
      hostname: string,
      options: { all: true },
    ) => Promise<Array<{ address: string; family: number }>>
  >(),
}));

vi.mock("node:dns/promises", () => ({
  lookup: mockedLookup,
}));

describe("resolveHostname", () => {
  it("returns all resolved IP addresses", async () => {
    mockedLookup.mockResolvedValue([
      {
        address: "93.184.216.34",
        family: 4,
      },
      {
        address: "2606:2800:220:1:248:1893:25c8:1946",
        family: 6,
      },
    ]);

    await expect(resolveHostname("example.com")).resolves.toEqual([
      "93.184.216.34",
      "2606:2800:220:1:248:1893:25c8:1946",
    ]);

    expect(mockedLookup).toHaveBeenCalledWith("example.com", {
      all: true,
    });
  });

  it("rejects when DNS resolution fails", async () => {
    mockedLookup.mockRejectedValue(new Error("DNS resolution failed"));

    await expect(
      resolveHostname("example.com"),
    ).rejects.toThrow("DNS resolution failed");
  });
});