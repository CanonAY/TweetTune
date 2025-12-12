import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { dbConnection } from './db/connection';
import { redisConnection } from './queue/redis';
import testRoutes from './routes/test.routes';
import queueRoutes from './routes/queue.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', async (req: Request, res: Response) => {
    try {
      const isDbConnected = await dbConnection.testConnection();
      const isRedisConnected = await redisConnection.ping();

      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: isDbConnected ? 'connected' : 'disconnected',
        redis: isRedisConnected ? 'connected' : 'disconnected',
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'error',
        redis: 'error',
      });
    }
  });

  app.use('/api/test', testRoutes);
  app.use('/api/queue', queueRoutes);

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  });

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
    });
  });

  return app;
}
