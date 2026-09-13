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

  app.use("/targets", createTargetRouter(db));
  app.use("/targets", createHealthRouter(db));

  return app;
}
