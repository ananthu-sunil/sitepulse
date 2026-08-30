import { pool } from "./db/client.js";
import { createApp } from "./app.js";
import { config } from "./config/env.js";

const app = createApp(pool);

app.listen(config.port, () => {
  console.log(`SitePulse API listening on port ${config.port}`);
});