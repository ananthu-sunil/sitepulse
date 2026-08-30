import { Pool } from "pg";
import { databaseConfig } from "../config/database.js";

export const testPool = new Pool({
  connectionString: databaseConfig.databaseTestUrl,
});