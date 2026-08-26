import { Pool } from "pg";
import { config } from "../config/env.js";

export const testPool = new Pool({
  connectionString: config.databaseTestUrl,
});