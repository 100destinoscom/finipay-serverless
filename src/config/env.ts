import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file (for local development)
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  CLOUDINARY_FOLDER: z.string().default('finpay/templates'),
  // Python Unified API (base URL without endpoint)
  PYTHON_API_URL: z.string().default('http://localhost:8000'),
  PYTHON_API_TIMEOUT: z.string().transform(Number).default('30000'),
  PYTHON_SERVICE_ENCRYPTION_KEY: z.string(),
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_TIME_WINDOW: z.string().default('15m'),
  API_KEY_PREFIX: z.string().default('fp_live_'),
  WEB_CONCURRENCY: z.string().transform(Number).default('1'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
  console.log('[ENV] ✅ Environment variables validated');
} catch (error) {
  console.error('❌ Invalid environment variables:', error);
  if (error instanceof z.ZodError) {
    console.error('Missing or invalid:', error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '));
  }
  // In serverless, throw instead of exit
  throw new Error('Failed to validate environment variables');
}

export { env };

// Helper to check if running in Vercel
export const isVercel = !!process.env.VERCEL;
export const isProduction = process.env.NODE_ENV === 'production';
