import cluster from 'cluster';
import { buildApp } from './app-factory';
import { env } from './config/env';

const numCPUs = env.WEB_CONCURRENCY;

async function start() {
  if (cluster.isPrimary && env.NODE_ENV === 'production') {
    console.log(`Primary ${process.pid} is running`);
    console.log(`Forking for ${numCPUs} CPUs...`);

    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, _code, _signal) => {
      console.log(`worker ${worker.process.pid} died`);
      // Replace dead worker
      cluster.fork();
    });
  } else {
    try {
      const app = await buildApp();

      await app.listen({
        port: env.PORT,
        host: '0.0.0.0',
      });

      console.log(`🚀 Server is running on http://localhost:${env.PORT} (Worker ${process.pid})`);
      if (cluster.isPrimary) { // Only log these once if not in cluster mode (dev)
        console.log(`📝 Environment: ${env.NODE_ENV}`);
        console.log(`🔗 API Base URL: http://localhost:${env.PORT}/api/v1`);
      }
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

start();
