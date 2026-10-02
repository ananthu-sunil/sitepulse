import express from "express";
import type { Pool } from "pg";
import { createTargetRouter } from "./targets/routes.js";
import { createHealthRouter } from "./health/routes.js";

export function createApp(db: Pool) {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
    });
  });

  app.get("/ready", async (_req, res) => {
    try {
      await db.query("SELECT 1");

      res.status(200).json({
        status: "ready",
      });
    } catch (error) {
      console.error("Readiness check failed:", error);

      res.status(503).json({
        status: "not_ready",
      });
    }
  });

  app.use("/targets", createTargetRouter(db));
  app.use("/targets", createHealthRouter(db));

  return app;
}
