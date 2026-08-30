import dotenv from "dotenv";
import path from "node:path";
import { createTestDatabase } from "../db/test-database.js";

dotenv.config({
  path: path.resolve(process.cwd(), "../.env"),
});

await createTestDatabase();