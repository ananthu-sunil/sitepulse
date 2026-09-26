import { describe, expect, it } from "vitest";
import { isSafeTargetUrl } from "./url-safety.js";

describe("isSafeTargetUrl", () => {
  it("accepts a public HTTP URL", () => {
    expect(isSafeTargetUrl(new URL("http://example.com"))).toBe(true);
  });

  it("accepts a public HTTPS URL", () => {
    expect(isSafeTargetUrl(new URL("https://example.com"))).toBe(true);
  });

  it("rejects localhost", () => {
    expect(isSafeTargetUrl(new URL("http://localhost"))).toBe(false);
  });

  it("rejects IPv4 loopback", () => {
    expect(isSafeTargetUrl(new URL("http://127.0.0.1"))).toBe(false);
  });

  it("rejects private 10/8 addresses", () => {
    expect(isSafeTargetUrl(new URL("http://10.0.0.1"))).toBe(false);
  });

  it("rejects private 172.16/12 addresses", () => {
    expect(isSafeTargetUrl(new URL("http://172.16.0.1"))).toBe(false);
  });

  it("rejects private 192.168/16 addresses", () => {
    expect(isSafeTargetUrl(new URL("http://192.168.1.1"))).toBe(false);
  });

  it("rejects IPv4 link-local addresses", () => {
    expect(isSafeTargetUrl(new URL("http://169.254.169.254"))).toBe(false);
  });

  it("rejects IPv6 loopback", () => {
    expect(isSafeTargetUrl(new URL("http://[::1]"))).toBe(false);
  });

  it("rejects unspecified IPv4", () => {
  expect(isSafeTargetUrl(new URL("http://0.0.0.0"))).toBe(false);
  });

  it("rejects unspecified IPv6", () => {
  expect(isSafeTargetUrl(new URL("http://[::]"))).toBe(false);
  });

  it("rejects IPv6 unique-local addresses", () => {
  expect(isSafeTargetUrl(new URL("http://[fd00::1]"))).toBe(false);
  });

  it("rejects IPv6 link-local addresses", () => {
  expect(isSafeTargetUrl(new URL("http://[fe80::1]"))).toBe(false);
  });
  
  it("accepts a public IPv4 address", () => {
  expect(isSafeTargetUrl(new URL("http://8.8.8.8"))).toBe(true);
  });
});