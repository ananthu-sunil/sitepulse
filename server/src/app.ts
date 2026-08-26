import express from "express";
import targetRoutes from "./targets/routes.js";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.use("/targets", targetRoutes);

export default app;