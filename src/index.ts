import * as dotenv from 'dotenv';
import { createApp } from './app';
import { dbConnection } from './db/connection';

dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('TweetTune Server - Starting...\n');

    const isConnected = await dbConnection.testConnection();

    if (!isConnected) {
      console.error('Database connection failed! Exiting...');
      process.exit(1);
    }

    const app = createApp();

    const server = app.listen(PORT, () => {
      console.log('\n=================================');
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('=================================\n');
      console.log('Available endpoints:');
      console.log(`  GET  http://localhost:${PORT}/health`);
      console.log(`  POST http://localhost:${PORT}/api/test/users`);
      console.log(`  GET  http://localhost:${PORT}/api/test/users`);
      console.log(`  POST http://localhost:${PORT}/api/test/tweets`);
      console.log(`  GET  http://localhost:${PORT}/api/test/tweets`);
      console.log(`  POST http://localhost:${PORT}/api/test/podcasts`);
      console.log(`  GET  http://localhost:${PORT}/api/test/podcasts`);
      console.log(`  POST http://localhost:${PORT}/api/test/usage-logs`);
      console.log(`  GET  http://localhost:${PORT}/api/test/usage-logs`);
      console.log(`  DEL  http://localhost:${PORT}/api/test/cleanup`);
      console.log('\n');
    });

    const gracefulShutdown = async () => {
      console.log('\nShutting down gracefully...');
      server.close(async () => {
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
