import { describe, expect, it } from "vitest";
import { resolveHostname } from "./resolve-host.js";

describe("resolveHostname", () => {
  it("resolves a valid hostname to one or more IP addresses", async () => {
    const addresses = await resolveHostname("example.com");

    expect(addresses.length).toBeGreaterThan(0);
    expect(addresses.every((address) => typeof address === "string")).toBe(
      true,
    );
  });

  it("rejects when the hostname cannot be resolved", async () => {
    await expect(
      resolveHostname("this-hostname-does-not-exist.invalid"),
    ).rejects.toThrow();
  });
});
