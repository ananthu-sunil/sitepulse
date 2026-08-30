import { createTestDatabase } from "../../../backend/src/db/test-database.js";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(process.cwd(), "../.env"),
});

await createTestDatabase();