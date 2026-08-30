import { Pool } from "pg";
import { migrate } from "@sitepulse/backend/db/migrate.js";

function getTestDatabaseUrl(): string {
  const url = process.env.DATABASE_TEST_URL;

  if (!url) {
    throw new Error("DATABASE_TEST_URL is required for tests");
  }
  return url;
}

const workerId = process.env.VITEST_POOL_ID ?? "default";
export const testSchema = `test_worker_${workerId}`;

export async function createTestDatabase() {
  await migrate(getTestDatabaseUrl(), testSchema);
}

export function createTestPool() {
  return new Pool({
    connectionString: getTestDatabaseUrl(),
    options: `-c search_path=${testSchema}`,
  });
}

export const testPool = createTestPool();