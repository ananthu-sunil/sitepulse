import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z.string().url(),

  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  DATABASE_IDLE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(10000),

  DATABASE_CONNECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),
});

const env = envSchema.parse(process.env);

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  database: {
    url: env.DATABASE_URL,
    poolMax: env.DATABASE_POOL_MAX,
    idleTimeoutMs: env.DATABASE_IDLE_TIMEOUT_MS,
    connectionTimeoutMs: env.DATABASE_CONNECTION_TIMEOUT_MS,
  },
};