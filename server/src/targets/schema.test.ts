import { describe, expect, it } from "vitest";
import { createTargetSchema } from "./schema.js";

describe("createTargetSchema", () => {
  it("accepts an HTTP URL", () => {
    const result = createTargetSchema.safeParse({
      url: "http://example.com",
    });

    expect(result.success).toBe(true);
  });

  it("accepts an HTTPS URL", () => {
    const result = createTargetSchema.safeParse({
      url: "https://example.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid URL", () => {
    const result = createTargetSchema.safeParse({
      url: "not-a-url",
    });

    expect(result.success).toBe(false);
  });

  it("rejects unsupported protocols", () => {
    const result = createTargetSchema.safeParse({
      url: "ftp://example.com",
    });

    expect(result.success).toBe(false);
  });

  it("rejects localhost", () => {
    const result = createTargetSchema.safeParse({
      url: "http://localhost",
    });

    expect(result.success).toBe(false);
  });

  it("rejects IPv4 loopback", () => {
    const result = createTargetSchema.safeParse({
      url: "http://127.0.0.1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects private IPv4 addresses", () => {
    const result = createTargetSchema.safeParse({
      url: "http://10.0.0.1",
    });

    expect(result.success).toBe(false);
  });

  it("rejects link-local IPv4 addresses", () => {
    const result = createTargetSchema.safeParse({
      url: "http://169.254.169.254",
    });

    expect(result.success).toBe(false);
  });

  it("rejects IPv6 loopback", () => {
    const result = createTargetSchema.safeParse({
      url: "http://[::1]",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a public IPv4 address", () => {
    const result = createTargetSchema.safeParse({
      url: "http://8.8.8.8",
    });

    expect(result.success).toBe(true);
  });
});