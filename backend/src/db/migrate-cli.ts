import { migrate } from "./migrate.js";

const databaseUrl =
  process.argv[2] === "test"
    ? process.env.DATABASE_TEST_URL
    : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    process.argv[2] === "test"
      ? "DATABASE_TEST_URL is required"
      : "DATABASE_URL is required",
  );
}

migrate(databaseUrl).catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
