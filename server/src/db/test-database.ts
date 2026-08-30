import { Pool } from "pg";
import { databaseConfig } from "@sitepulse/backend/config/database.js";
import { migrate } from "./migrate.js";

const workerId = process.env.VITEST_POOL_ID ?? "default";

export const testSchema = `test_worker_${workerId}`;

export async function createTestDatabase() {
  await migrate(databaseConfig.databaseTestUrl, testSchema);
}

export function createTestPool() {
  return new Pool({
    connectionString: databaseConfig.databaseTestUrl,
    options: `-c search_path=${testSchema}`,
  });
}