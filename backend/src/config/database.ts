import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  DATABASE_TEST_URL: z.url(),
});

const env = envSchema.parse(process.env);

export const databaseConfig = {
  databaseUrl: env.DATABASE_URL,
  databaseTestUrl: env.DATABASE_TEST_URL,
};