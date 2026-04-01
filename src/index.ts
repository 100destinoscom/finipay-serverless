import 'dotenv/config';
import type { FastifyInstance } from 'fastify';
import { buildApp } from './app-factory';
import { buildCorsHeaders } from './config/cors';

let server: FastifyInstance | null = null;
let isInitializing = false;

async function getServer() {
  while (isInitializing) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (!server) {
    isInitializing = true;
    try {
      console.log('[Handler] Initializing Fastify server...');
      server = await buildApp();
      await server.ready();
      console.log('[Handler] Server ready');
    } catch (error) {
      console.error('[Handler] Failed to initialize server:', error);
      throw error;
    } finally {
      isInitializing = false;
    }
  }

  return server;
}

export default async function handler(req: any, res: any) {
  try {
    console.log(`[Handler] ${req.method} ${req.url}`);

    const app = await getServer();
    const response = await app.inject({
      method: req.method as any,
      url: req.url || req.originalUrl || '/',
      headers: req.headers as any,
      payload: req.body,
    });

    console.log(`[Handler] Response: ${response.statusCode}`);

    const headers = {
      ...buildCorsHeaders(req.headers?.origin),
      ...(response.headers || {}),
    };

    res.status(response.statusCode);
    for (const [key, value] of Object.entries(headers)) {
      if (typeof value === 'string' || Array.isArray(value)) {
        res.setHeader(key, value);
      }
    }

    res.send(response.body);
  } catch (err: any) {
    console.error('[Vercel Handler] Error:', err);

    const corsHeaders = buildCorsHeaders(req.headers?.origin);
    for (const [key, value] of Object.entries(corsHeaders)) {
      res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: err?.message || String(err),
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
    });
  }
}

if (require.main === module) {
  const startLocalServer = async () => {
    try {
      const app = await buildApp();
      const port = parseInt(process.env.PORT || '3000', 10);
      await app.listen({ port, host: '0.0.0.0' });
      console.log(`Server running at http://localhost:${port}`);
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  };

  startLocalServer();
}
