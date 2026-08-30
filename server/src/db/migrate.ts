import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { databaseConfig } from "../config/database.js";

const migrationsDirectory = path.join(import.meta.dirname, "migrations");

export async function migrate(databaseUrl: string, schema: string = "public",) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    if (schema !== "public") {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`,);
    }
    const client = await pool.connect();
    try {
      if (schema !== "public") {
        await client.query(`SET search_path TO "${schema}"`,);
      }
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          filename TEXT NOT NULL UNIQUE,
          applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        )
      `);
      const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
      const result = await client.query<{ filename: string }>("SELECT filename FROM schema_migrations ORDER BY filename",);

      const appliedMigrations = new Set(result.rows.map((row) => row.filename),);

      for (const file of files) {
        if (appliedMigrations.has(file)) {
          continue;
        }
        const migrationPath = path.join(migrationsDirectory,file,);
        const sql = await readFile(migrationPath, "utf8");

        try {
          await client.query("BEGIN");
          await client.query(sql);

          await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)",[file],);
          await client.query("COMMIT");

          console.log(`Applied migration: ${file}`);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        }
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

const databaseUrl =
  process.argv[2] === "test"
    ? databaseConfig.databaseTestUrl
    : databaseConfig.databaseUrl;

migrate(databaseUrl).catch(async (error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});