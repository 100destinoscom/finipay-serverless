import { env } from './env';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://finpaydashboard.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
] as const;

const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
export const CORS_ALLOWED_HEADERS = ['Authorization', 'Content-Type', 'X-API-Key'];

function getConfiguredOrigins(): string[] {
  return env.CORS_ORIGINS
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(): string[] {
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...getConfiguredOrigins()])];
}

export function isOriginAllowed(origin?: string | null): boolean {
  if (!origin) {
    return true;
  }

  if (LOCALHOST_ORIGIN_PATTERN.test(origin)) {
    return true;
  }

  return getAllowedOrigins().includes(origin);
}

export function buildCorsHeaders(origin?: string | string[] | null): Record<string, string> {
  const normalizedOrigin = Array.isArray(origin) ? origin[0] : origin;

  if (!normalizedOrigin || !isOriginAllowed(normalizedOrigin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': normalizedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': CORS_METHODS.join(', '),
    'Access-Control-Allow-Headers': CORS_ALLOWED_HEADERS.join(', '),
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
