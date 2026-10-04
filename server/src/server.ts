import type { Server } from "node:http";
import { pool } from "./db/client.js";
import { createApp } from "./app.js";
import { config } from "./config/env.js";

const app = createApp(pool);

const server: Server = app.listen(config.port, () => {
  console.log(`SitePulse API listening on port ${config.port}`);
});

let shuttingDown = false;

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`Received ${signal}. Shutting down server...`);

  server.close(async () => {
    await pool.end();
    console.log("SitePulse API stopped.");
  });
};

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
