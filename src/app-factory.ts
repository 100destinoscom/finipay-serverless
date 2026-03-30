import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import cookie from '@fastify/cookie';
import { env } from './config/env';
import { errorHandler } from './utils/errors';

// Import routes
import authRoutes from './routes/v1/auth';
import templatesRoutes from './routes/v1/templates';
import apiKeysRoutes from './routes/v1/apiKeys';
import validateRoutes from './routes/v1/validate';
import profileRoutes from './routes/v1/profile';
import bankRoutes from './routes/v1/banks';
import statsRoutes from './routes/v1/stats';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
    },
    trustProxy: true,
    requestTimeout: 30000,
  });

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(cookie, {
    secret: env.JWT_SECRET, // Use JWT_SECRET as cookie secret
    hook: 'onRequest',
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Compression (skip in serverless if needed)
  if (!process.env.DISABLE_COMPRESSION) {
    await app.register(compress, {
      global: true,
      threshold: 1024,
      encodings: ['gzip', 'deflate']
    });
  }

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 1,
    },
  });

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '15 minutes',
  });

  // Error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });

  // Root redirect
  // Root route
  app.get('/', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: 'Finpay Service'
    };
  });

  // API v1 routes
  app.register(
    async (api) => {
      api.register(authRoutes, { prefix: '/auth' });
      api.register(templatesRoutes, { prefix: '/templates' });
      api.register(apiKeysRoutes, { prefix: '/apikeys' });
      api.register(validateRoutes, { prefix: '/validate' });
      api.register(profileRoutes, { prefix: '/profile' });
      api.register(bankRoutes, { prefix: '/banks' });
      api.register(statsRoutes, { prefix: '/stats' });
    },
    { prefix: '/api/v1' }
  );

  // 404 handler
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      error: {
        message: 'Route not found',
        statusCode: 404,
      },
    });
  });

  return app;
}
