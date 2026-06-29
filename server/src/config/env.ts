import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),

  NODE_ENV: z
    .enum([
      'development',
      'test',
      'production',
    ])
    .default('development'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z
    .string()
    .min(
      64,
      'JWT_SECRET must contain at least 64 characters',
    ),

  JWT_EXPIRES_IN: z
    .string()
    .default('7d'),

  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL must be a valid URL'),

  SUPABASE_SECRET_KEY: z
    .string()
    .min(
      1,
      'SUPABASE_SECRET_KEY is required',
    ),

  SUPABASE_STORAGE_BUCKET: z
    .string()
    .min(
      1,
      'SUPABASE_STORAGE_BUCKET is required',
    ),

  FILE_UPLOAD_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(20 * 1024 * 1024),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid environment variables:');
  console.error(
    z.treeifyError(result.error),
  );

  throw new Error(
    'Environment variables validation failed',
  );
}

export const env = result.data;