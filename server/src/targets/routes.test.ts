import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";
import { pool } from "../db/client.js";

afterAll(async () => {await pool.end();});

describe("POST /targets", () => {
  beforeEach(async () => {
  await pool.query("DELETE FROM scans");
  await pool.query("DELETE FROM monitored_targets");
  });
  
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
  beforeEach(async () => {await pool.query("DELETE FROM monitored_targets");});
  
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
  beforeEach(async () => {await pool.query("DELETE FROM monitored_targets");});

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
  beforeEach(async () => {await pool.query("DELETE FROM monitored_targets");});

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
});