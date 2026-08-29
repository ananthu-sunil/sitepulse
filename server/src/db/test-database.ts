import { Pool } from "pg";
import { config } from "../config/env.js";
import { migrate } from "./migrate.js";

const workerId = process.env.VITEST_POOL_ID ?? "default";

export const testSchema = `test_worker_${workerId}`;

export async function createTestDatabase() {
  await migrate(config.databaseTestUrl, testSchema);
}

export function createTestPool() {
  return new Pool({
    connectionString: config.databaseTestUrl,
    options: `-c search_path=${testSchema}`,
  });
}