import { afterAll, describe, expect, it } from "vitest";
import { pool } from "./client.js";

describe("PostgreSQL connection", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("connects to PostgreSQL and executes a query", async () => {
    const result = await pool.query("SELECT 1 AS value");

    expect(result.rows[0]).toEqual({
      value: 1,
    }); 
  });
});