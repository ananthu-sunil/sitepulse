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
});