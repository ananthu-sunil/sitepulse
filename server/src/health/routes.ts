import { Router } from "express";
import type { Pool } from "pg";
import { getHealth } from "@sitepulse/backend/health/health-service.js";

export function createHealthRouter(db: Pool) {
  const router = Router();

  router.get("/:id/status", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        error: "Invalid target ID",
      });
      return;
    }

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const health = await getHealth(db, id, since);

      if (!health) {
        res.status(404).json({
          error: "Target not found",
        });
        return;
      }

      res.status(200).json(health);
    } catch (error) {
      console.error("Failed to get target health:", error);

      res.status(500).json({
        error: "Failed to get target health",
      });
    }
  });

  return router;
}