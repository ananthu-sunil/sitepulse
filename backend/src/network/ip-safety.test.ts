import { describe, expect, it } from "vitest";
import { isIpAddress, isSafeIpAddress } from "./ip-safety.js";

describe("isIpAddress", () => {
  it("identifies IPv4 addresses", () => {
    expect(isIpAddress("8.8.8.8")).toBe(true);
  });

  it("identifies IPv6 addresses", () => {
    expect(isIpAddress("::1")).toBe(true);
  });

  it("rejects hostnames as IP addresses", () => {
    expect(isIpAddress("example.com")).toBe(false);
  });
});

describe("isSafeIpAddress", () => {
  it("accepts a public IPv4 address", () => {
    expect(isSafeIpAddress("8.8.8.8")).toBe(true);
  });

  it("rejects private 10/8 addresses", () => {
    expect(isSafeIpAddress("10.0.0.1")).toBe(false);
  });

  it("rejects private 172.16/12 addresses", () => {
    expect(isSafeIpAddress("172.16.0.1")).toBe(false);
  });

  it("rejects private 192.168/16 addresses", () => {
    expect(isSafeIpAddress("192.168.1.1")).toBe(false);
  });

  it("rejects IPv4 loopback addresses", () => {
    expect(isSafeIpAddress("127.0.0.1")).toBe(false);
  });

  it("rejects IPv4 link-local addresses", () => {
    expect(isSafeIpAddress("169.254.169.254")).toBe(false);
  });

  it("rejects unspecified IPv4 addresses", () => {
    expect(isSafeIpAddress("0.0.0.0")).toBe(false);
  });

  it("rejects IPv6 loopback", () => {
    expect(isSafeIpAddress("::1")).toBe(false);
  });

  it("rejects unspecified IPv6", () => {
    expect(isSafeIpAddress("::")).toBe(false);
  });

  it("rejects IPv6 unique-local addresses", () => {
    expect(isSafeIpAddress("fd00::1")).toBe(false);
  });

  it("rejects IPv6 link-local addresses", () => {
    expect(isSafeIpAddress("fe80::1")).toBe(false);
  });
});
