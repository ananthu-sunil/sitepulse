import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";
import { pool } from "../db/client.js";

describe("POST /targets", () => {
  beforeEach(async () => {await pool.query("DELETE FROM monitored_targets");});
  afterAll(async () => {await pool.end();});

  it("creates a monitored target", async () => {
    const response = await request(app).post("/targets").send({url: "https://example.com",});
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({url: "https://example.com",active: true,});
    expect(response.body.id).toEqual(expect.any(Number));
  });

  it("rejects an invalid URL", async () => {
    const response = await request(app).post("/targets").send({url: "not-a-url",});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid target");
  });

  it("rejects a duplicate target URL", async () => {
    await request(app).post("/targets").send({url: "https://example.com",});
    const response = await request(app).post("/targets").send({url: "https://example.com",});
    expect(response.status).toBe(409);
    expect(response.body).toEqual({error: "Target URL already exists",});
  });
});