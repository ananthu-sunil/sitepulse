import { afterAll, describe, expect, it } from "vitest";
import { testPool } from "./test-client.js";

describe("PostgreSQL connection", () => {
  afterAll(async () => {
    await testPool.end();
  });

  it("connects to PostgreSQL and executes a query", async () => {
    const result = await testPool.query("SELECT 1 AS value");

    expect(result.rows[0]).toEqual({
      value: 1,
    }); 
  });
});