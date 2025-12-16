import express, { Application, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from './auth/passport';
import { dbConnection } from './db/connection';
import { redisConnection } from './queue/redis';
import testRoutes from './routes/test.routes';
import queueRoutes from './routes/queue.routes';
import authRoutes from './routes/auth.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

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

  app.use('/api/auth', authRoutes);
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
