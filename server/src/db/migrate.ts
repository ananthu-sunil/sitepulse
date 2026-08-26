import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "./client.js";

const migrationsDirectory = path.join(import.meta.dirname, "migrations");

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  const result = await pool.query<{ filename: string }>("SELECT filename FROM schema_migrations ORDER BY filename");
  const appliedMigrations = new Set(result.rows.map((row) => row.filename));
  for (const file of files) {
    if (appliedMigrations.has(file)) {
      continue;
    }

    const migrationPath = path.join(migrationsDirectory, file);
    const sql = await readFile(migrationPath, "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      console.log(`Applied migration: ${file}`);
      
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
      
    } finally {
      client.release();
    }
  }
  await pool.end();
}

migrate().catch(async (error) => {
  console.error("Migration failed:", error);
  await pool.end();
  process.exit(1);
});