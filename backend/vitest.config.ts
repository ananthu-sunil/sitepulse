import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config({ path: "../.env" });

export default defineConfig({
  test: {
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["dist/**"],
  },
});