import { lookup } from "node:dns/promises";
import { describe, expect, it, vi } from "vitest";
import { resolveHostname } from "./resolve-host.js";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

const mockedLookup = vi.mocked(lookup);

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