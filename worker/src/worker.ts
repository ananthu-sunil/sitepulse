import { Pool } from "pg";
import { runScanCycle } from "./scan-cycle.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({connectionString: databaseUrl,});

try {
  console.log("SitePulse worker starting...");
  await runScanCycle(pool);

  console.log("Scan cycle completed.");
} catch (error) {
  console.error("Worker failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}