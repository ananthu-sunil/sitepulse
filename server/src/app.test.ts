import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { testPool } from "./db/test-database.js";

const app = createApp(testPool);

describe("GET /health", () => {
  it("returns a healthy status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
    });
  });
});