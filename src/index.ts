import * as dotenv from 'dotenv';
import { createApp } from './app';
import { dbConnection } from './db/connection';
import { redisConnection } from './queue/redis';
import { workerManager } from './queue/workers';
import { queueManager } from './queue/queue-manager';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('TweetTune Server - Starting...\n');

    const isDbConnected = await dbConnection.testConnection();
    if (!isDbConnected) {
      console.error('Database connection failed! Exiting...');
      process.exit(1);
    }

    const isRedisConnected = await redisConnection.ping();
    if (!isRedisConnected) {
      console.error('Redis connection failed! Exiting...');
      process.exit(1);
    }

    console.log('\n');

    const app = createApp();

    const server = app.listen(PORT, () => {
      console.log('=================================');
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('=================================\n');
      console.log('Authentication Endpoints:');
      console.log(`  GET  http://localhost:${PORT}/api/auth/status`);
      console.log(`  GET  http://localhost:${PORT}/api/auth/twitter`);
      console.log(`  GET  http://localhost:${PORT}/api/auth/twitter/callback`);
      console.log(`  GET  http://localhost:${PORT}/api/auth/me (requires JWT)`);
      console.log(`  POST http://localhost:${PORT}/api/auth/logout (requires JWT)\n`);
      console.log('Queue Endpoints:');
      console.log(`  POST http://localhost:${PORT}/api/queue/jobs/fetch-tweets (requires JWT)`);
      console.log(`  POST http://localhost:${PORT}/api/queue/jobs/analyze-emotions`);
      console.log(`  POST http://localhost:${PORT}/api/queue/jobs/generate-audio`);
      console.log(`  POST http://localhost:${PORT}/api/queue/jobs/assemble-podcast`);
      console.log(`  GET  http://localhost:${PORT}/api/queue/jobs/:jobType/:jobId`);
      console.log(`  GET  http://localhost:${PORT}/api/queue/queues/stats\n`);
      console.log('Test Endpoints:');
      console.log(`  GET  http://localhost:${PORT}/health`);
      console.log(`  GET  http://localhost:${PORT}/api/test/users`);
      console.log(`  POST http://localhost:${PORT}/api/test/tweets`);
      console.log(`  POST http://localhost:${PORT}/api/test/podcasts`);
      console.log('\n');
    });

    const gracefulShutdown = async () => {
      console.log('\nShutting down gracefully...');
      server.close(async () => {
        await workerManager.closeAll();
        await queueManager.closeAll();
        await redisConnection.disconnect();
        await dbConnection.close();
        console.log('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

startServer();
