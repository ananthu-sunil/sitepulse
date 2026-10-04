import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { testPool } from "./db/test-database.js";

const app = createApp(testPool);

afterAll(async () => {
  await testPool.end();
});

describe("GET /health", () => {
  it("returns a healthy status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
    });
  });
});

describe("GET /ready", () => {
  it("returns 200 when the database is reachable", async () => {
    const response = await request(app).get("/ready");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ready",
    });
  });

  it("returns 503 when the database check fails", async () => {
    const failingDb = {
      query: async () => {
        throw new Error("Database unavailable");
      },
    } as unknown as typeof testPool;

    const failingApp = createApp(failingDb);
    const response = await request(failingApp).get("/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: "not_ready",
    });
  });
});
