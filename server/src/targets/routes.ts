import { Router } from "express";
import { createMonitoredTarget, listMonitoredTargets, getMonitoredTargetById, updateMonitoredTarget } from "@sitepulse/backend/db/monitored-targets.js";
import { createTargetSchema, updateTargetSchema } from "./schema.js";
import { pool } from "../db/client.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const targets = await listMonitoredTargets(pool);

    res.status(200).json(targets);
  } catch (error) {
    console.error("Failed to list monitored targets:", error);

    res.status(500).json({
      error: "Failed to list monitored targets",
    });
  }
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {res.status(400).json({error: "Invalid target ID",});
    return;
  }
  try {
    const target = await getMonitoredTargetById(pool, id);
    if (!target) {res.status(404).json({error: "Target not found",});
    return;
  }
    res.status(200).json(target);
  } catch (error) {
    console.error("Failed to get monitored target:", error);
    res.status(500).json({error: "Failed to get monitored target",});
  }
});

router.post("/", async (req, res) => {
  const result = createTargetSchema.safeParse(req.body);

  if (!result.success) {res.status(400).json({error: "Invalid target",details: result.error.issues,});
    return;
  }
  try {
    const target = await createMonitoredTarget(pool,result.data.url);
    res.status(201).json(target);
    
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      res.status(409).json({error: "Target URL already exists",});
      return;
    }
    console.error("Failed to create monitored target:", error);
    res.status(500).json({error: "Failed to create monitored target",});
  }
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {res.status(400).json({error: "Invalid target ID",});
    return;
  }

  const result = updateTargetSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({error: "Invalid target", details: result.error.issues,});
    return;
  }

  try {
    const target = await updateMonitoredTarget(pool, id, result.data.active,);

    if (!target) {
      res.status(404).json({error: "Target not found",});
      return;
    }
    res.status(200).json(target);
  } catch (error) {
    console.error("Failed to update monitored target:", error);

    res.status(500).json({
      error: "Failed to update monitored target",
    });
  }
});

export default router;