import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { testPool } from "../db/test-database.js";
import { recordScan } from "@sitepulse/backend/db/scans.js";
import {createMonitoredTarget} from "@sitepulse/backend/db/monitored-targets.js";

const app = createApp(testPool);

afterAll(async () => {await testPool.end();});

async function clearTargets() {
  await testPool.query("DELETE FROM scans");
  await testPool.query("DELETE FROM monitored_targets");
}

describe("POST /targets", () => {
  beforeEach(clearTargets);
  
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

describe("GET /targets", () => {
  beforeEach(clearTargets);
  
  it("returns all monitored targets", async () => {await request(app).post("/targets").send({ url: "https://example.com" });
  await request(app).post("/targets").send({ url: "https://google.com" });
  const response = await request(app).get("/targets");
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({url: "https://example.com",active: true,}),
        expect.objectContaining({url: "https://google.com",active: true,
        }),
      ]),
    );
  });

  it("returns an empty array when no targets exist", async () => {const response = await request(app).get("/targets");
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});

describe("GET /targets/:id", () => {
  beforeEach(clearTargets);

  it("returns a monitored target by ID", async () => {
    const createResponse = await request(app).post("/targets").send({ url: "https://example.com" });
    const targetId = createResponse.body.id;
    const response = await request(app).get(`/targets/${targetId}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({id: targetId,url: "https://example.com",active: true,});
  });

  it("returns 404 when the target does not exist", async () => {
    const response = await request(app).get("/targets/999999");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({error: "Target not found",
    });
  });

  it("rejects an invalid target ID", async () => {
    const response = await request(app).get("/targets/abc");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({error: "Invalid target ID",});
  });
});

describe("PATCH /targets/:id", () => {
  beforeEach(clearTargets);

  it("updates the active status of a target", async () => {
    const createResponse = await request(app).post("/targets").send({ url: "https://example.com" });
    const targetId = createResponse.body.id;
    const response = await request(app).patch(`/targets/${targetId}`).send({ active: false });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({id: targetId, url: "https://example.com", active: false,});
  });

  it("returns 404 when the target does not exist", async () => {
    const response = await request(app).patch("/targets/999999").send({ active: false });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({error: "Target not found",});
  });

  it("rejects an invalid target ID", async () => {
    const response = await request(app).patch("/targets/abc").send({ active: false });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({error: "Invalid target ID",});
  });

  it("rejects an invalid active value", async () => {
    const createResponse = await request(app).post("/targets").send({ url: "https://example.com" });
    const targetId = createResponse.body.id;
    const response = await request(app).patch(`/targets/${targetId}`).send({ active: "false" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid target");
  });

  describe("GET /targets/:id/scans", () => {
    it("returns scan history for an existing target", async () => {
      const target = await createMonitoredTarget(testPool, "https://example.com");

      await recordScan(testPool, target.id, {
        statusCode: 200,
        responseTimeMs: 120,
        available: true,
      });

      await recordScan(testPool, target.id, {
        statusCode: 500,
        responseTimeMs: 250,
        available: false,
      });

      const response = await request(app).get(`/targets/${target.id}/scans`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        targetId: target.id,
        statusCode: 500,
        responseTimeMs: 250,
        available: false,
      });

      expect(response.body[1]).toMatchObject({
        targetId: target.id,
        statusCode: 200,
        responseTimeMs: 120,
        available: true,
        });
      });
    });

    it("defaults to a limit of 50 scans", async () => {
      const target = await createMonitoredTarget(testPool, "https://example.com");
      for (let i = 0; i < 55; i++) {
        await recordScan(testPool, target.id, {
          statusCode: 200,
          responseTimeMs: i,
          available: true,
        });
      }

      const response = await request(app).get(`/targets/${target.id}/scans`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(50);
      });

    it("respects a valid limit", async () => {
      const target = await createMonitoredTarget(testPool, "https://example.com");

      for (let i = 0; i < 10; i++) {
        await recordScan(testPool, target.id, {
          statusCode: 200,
          responseTimeMs: i,
          available: true,
        });
      }

      const response = await request(app).get(`/targets/${target.id}/scans?limit=3`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
    });

    it.each(["0", "-1", "abc", "1.5"])("returns 400 for invalid target ID: %s", async (id) => {
        const response = await request(app).get(`/targets/${id}/scans`);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          error: "Invalid target ID",
        });
      },
    );

    it.each(["0", "-1", "1.5", "abc", "101"])(
      "returns 400 for invalid limit: %s",
      async (limit) => {
        const target = await createMonitoredTarget(testPool, "https://example.com");
        const response = await request(app).get(`/targets/${target.id}/scans?limit=${limit}`);

        expect(response.status).toBe(400);
        expect(response.body).toEqual({error: "Invalid limit"});
      },
    );

    it("returns 404 when the target does not exist", async () => {
      const response = await request(app).get("/targets/999999/scans");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: "Target not found",
      });
    });

    it("returns scans only for the requested target", async () => {
      const targetA = await createMonitoredTarget(testPool, "https://example-a.com");
      const targetB = await createMonitoredTarget(testPool, "https://example-b.com");

      await recordScan(testPool, targetA.id, {
        statusCode: 200,
        responseTimeMs: 100,
        available: true,
      });

      await recordScan(testPool, targetB.id, {
        statusCode: 200,
        responseTimeMs: 200,
        available: true,
      });

      const response = await request(app).get(`/targets/${targetA.id}/scans`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].targetId).toBe(targetA.id);
    });
});