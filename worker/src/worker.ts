import { Pool } from "pg";
import { runScanCycle } from "./scan-cycle.js";
import { startScheduler } from "./scheduler.js";

const databaseUrl = process.env.DATABASE_URL;
const scanIntervalMs = Number(process.env.SCAN_INTERVAL_MS);

if (!databaseUrl) {throw new Error("DATABASE_URL is not set");}
if (!Number.isFinite(scanIntervalMs) || scanIntervalMs <= 0) {throw new Error("SCAN_INTERVAL_MS must be a positive number");}

const pool = new Pool({connectionString: databaseUrl,});

let scheduler: ReturnType<typeof startScheduler> | undefined;
let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) {return;}
  shuttingDown = true;
  console.log(`Received ${signal}. Shutting down worker...`);

  scheduler?.stop();
  await scheduler?.done;
  await pool.end();

  console.log("SitePulse worker stopped.");
};

process.once("SIGINT", () => {void shutdown("SIGINT");});
process.once("SIGTERM", () => {void shutdown("SIGTERM");});

console.log("SitePulse worker starting...");

scheduler = startScheduler(
  async () => {
    await runScanCycle(pool);
    console.log("Scan cycle completed.");
  },
  scanIntervalMs,
);
