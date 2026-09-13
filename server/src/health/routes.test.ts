import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { testPool } from "../db/test-database.js";

const app = createApp(testPool);

afterAll(async () => {await testPool.end();});

async function clearTargets() {
  await testPool.query("DELETE FROM scans");
  await testPool.query("DELETE FROM monitored_targets");
}

describe("GET /targets/:id/status", () => {
  beforeEach(clearTargets);

  it("returns unknown when the target has no scans", async () => {
    const createResponse = await request(app).post("/targets").send({ url: "https://example.com" });
    const targetId = createResponse.body.id;
    const response = await request(app).get(`/targets/${targetId}/status`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "unknown",
      uptimePercentage: null,
      averageResponseTimeMs: null,
      consecutiveFailures: 0,
    });
  });

  it("returns up health for an available target", async () => {
    const createResponse = await request(app).post("/targets").send({ url: "https://example.com" });
    const targetId = createResponse.body.id;

    await testPool.query(
        `
        INSERT INTO scans (
            target_id,
            status_code,
            response_time_ms,
            available,
            scanned_at
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [targetId, 200, 120, true, new Date()],
    );

    const response = await request(app).get(`/targets/${targetId}/status`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("up");
    expect(response.body.uptimePercentage).toBe(100);
    expect(response.body.averageResponseTimeMs).toBe(120);
    expect(response.body.consecutiveFailures).toBe(0);
  });

  it("returns down health and consecutive failures", async () => {
    const createResponse = await request(app).post("/targets").send({ url: "https://example.com" });
    const targetId = createResponse.body.id;
    const now = Date.now();

    await testPool.query(
        `
        INSERT INTO scans (
            target_id,
            status_code,
            response_time_ms,
            available,
            error,
            scanned_at
        )
        VALUES
          ($1, $2, $3, $4, $5, $6),
          ($7, $8, $9, $10, $11, $12),
          ($13, $14, $15, $16, $17, $18)
        `,
        [
        targetId,
        200,
        100,
        true,
        null,
        new Date(now - 3000),
        targetId,
        null,
        5000,
        false,
        "timeout",
        new Date(now - 2000),
        targetId,
        null,
        5000,
        false,
        "timeout",
        new Date(now - 1000),
        ],
    );
    const response = await request(app).get(`/targets/${targetId}/status`,);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("down");
    expect(response.body.uptimePercentage).toBeCloseTo(33.33, 1);
    expect(response.body.averageResponseTimeMs).toBe(100);
    expect(response.body.consecutiveFailures).toBe(2);
  });

  it("returns 404 when the target does not exist", async () => {
    const response = await request(app).get("/targets/999999/status");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({error: "Target not found"});
  });

  it("rejects an invalid target ID", async () => {
    const response = await request(app).get("/targets/abc/status");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({error: "Invalid target ID"});
  });

  it("calculates health using only the last 24 hours", async () => {
    const createResponse = await request(app).post("/targets").send({ url: "https://example.com" });
    const targetId = createResponse.body.id;
    const now = Date.now();
    await testPool.query(
        `
        INSERT INTO scans (
            target_id,
            status_code,
            response_time_ms,
            available,
            error,
            scanned_at
        )
        VALUES
            ($1, $2, $3, $4, $5, $6),
            ($7, $8, $9, $10, $11, $12)
        `,
        [
        targetId,
        null,
        5000,
        false,
        "timeout",
        new Date(now - 25 * 60 * 60 * 1000),
        targetId,
        200,
        150,
        true,
        null,
        new Date(now - 60 * 60 * 1000),
        ],
    );

    const response = await request(app).get(`/targets/${targetId}/status`);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("up");
    expect(response.body.uptimePercentage).toBe(100);
    expect(response.body.averageResponseTimeMs).toBe(150);
    expect(response.body.consecutiveFailures).toBe(0);
  });
  
});
