import { Router } from "express";
import { createMonitoredTarget } from "../db/monitored-targets.js";
import { createTargetSchema } from "./schema.js";
import { pool } from "../db/client.js";

const router = Router();

router.post("/", async (req, res) => {
  const result = createTargetSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: "Invalid target",
      details: result.error.issues,
    });
    return;
  }

  try {
    const target = await createMonitoredTarget(pool,result.data.url);
    res.status(201).json(target);
    
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({
        error: "Target URL already exists",
      });
      return;
    }

    console.error("Failed to create monitored target:", error);

    res.status(500).json({
      error: "Failed to create monitored target",
    });
  }
});

export default router;