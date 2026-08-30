import { createTestDatabase } from "../db/test-database.js";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(import.meta.dirname, "../../../.env"),
});

await createTestDatabase();