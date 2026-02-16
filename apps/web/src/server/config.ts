import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  AWS_REGION: z.string().default("ap-south-1"),
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  COGNITO_JWKS_URL: z.string().url().optional(),
  TRANSLATE_API_URL: z.string().url().default("https://libretranslate.de/translate"),
  TRANSLATE_API_KEY: z.string().optional(),
  TRANSLATE_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  S3_BUCKET: z.string().optional(),
  S3_UPLOAD_PREFIX: z.string().default("uploads"),
  S3_EXPORT_PREFIX: z.string().default("exports"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120)
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));
  throw new Error(`Invalid environment configuration: ${JSON.stringify(issues)}`);
}

export const config = parsed.data;
