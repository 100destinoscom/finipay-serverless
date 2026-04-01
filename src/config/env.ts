import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file (for local development)
dotenv.config();

const rawEnvSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  CLOUDINARY_FOLDER: z.string().default('finpay/templates'),
  // Python Unified API (base URL without endpoint)
  PYTHON_API_URL: z.string().optional(),
  PYTHON_SERVICE_URL: z.string().optional(),
  PYTHON_API_TIMEOUT: z.union([z.string(), z.number()]).optional(),
  PYTHON_SERVICE_TIMEOUT: z.union([z.string(), z.number()]).optional(),
  PYTHON_SERVICE_ENCRYPTION_KEY: z.string().optional(),
  PORT: z.union([z.string(), z.number()]).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  RATE_LIMIT_MAX: z.union([z.string(), z.number()]).optional(),
  RATE_LIMIT_TIME_WINDOW: z.string().default('15m'),
  API_KEY_PREFIX: z.string().default('fp_live_'),
  WEB_CONCURRENCY: z.union([z.string(), z.number()]).optional(),
  CORS_ORIGINS: z.string().optional(),
});

const numberWithFallback = (value: string | number | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const envSchema = rawEnvSchema.transform((raw) => ({
  ...raw,
  PYTHON_API_URL: raw.PYTHON_API_URL || raw.PYTHON_SERVICE_URL || 'http://localhost:8000',
  PYTHON_API_TIMEOUT: numberWithFallback(raw.PYTHON_API_TIMEOUT ?? raw.PYTHON_SERVICE_TIMEOUT, 30000),
  PYTHON_SERVICE_ENCRYPTION_KEY: raw.PYTHON_SERVICE_ENCRYPTION_KEY || '',
  PORT: numberWithFallback(raw.PORT, 3000),
  RATE_LIMIT_MAX: numberWithFallback(raw.RATE_LIMIT_MAX, 100),
  WEB_CONCURRENCY: numberWithFallback(raw.WEB_CONCURRENCY, 1),
  CORS_ORIGINS: raw.CORS_ORIGINS || '',
}));

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  console.log('[ENV] Environment variables validated');
} catch (error) {
  console.error('Invalid environment variables:', error);
  if (error instanceof z.ZodError) {
    console.error('Missing or invalid:', error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '));
  }
  throw new Error('Failed to validate environment variables');
}

if (!process.env.PYTHON_API_URL && process.env.PYTHON_SERVICE_URL) {
  console.warn('[ENV] Using legacy PYTHON_SERVICE_URL. Prefer PYTHON_API_URL.');
}

if (!process.env.PYTHON_API_TIMEOUT && process.env.PYTHON_SERVICE_TIMEOUT) {
  console.warn('[ENV] Using legacy PYTHON_SERVICE_TIMEOUT. Prefer PYTHON_API_TIMEOUT.');
}

if (!env.PYTHON_SERVICE_ENCRYPTION_KEY) {
  console.warn('[ENV] PYTHON_SERVICE_ENCRYPTION_KEY is not set. Validation routes will fail until it is configured.');
}

export { env };

export const isVercel = !!process.env.VERCEL;
export const isProduction = process.env.NODE_ENV === 'production';
