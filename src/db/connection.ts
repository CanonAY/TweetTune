import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as dotenv from 'dotenv';
import * as schema from './schema';

dotenv.config();

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  public db: ReturnType<typeof drizzle>;

  private constructor() {
    const poolConfig = this.getPoolConfig();
    this.pool = new Pool(poolConfig);
    this.db = drizzle(this.pool, { schema });

    this.logConnectionInfo();

    this.pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
      process.exit(-1);
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private getPoolConfig(): PoolConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const config: PoolConfig = {
      connectionString: databaseUrl,
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    if (isProduction && this.isCloudSqlConnection(databaseUrl)) {
      if (databaseUrl.includes('/cloudsql/')) {
        console.log('Using GCP Cloud SQL Unix socket connection');
      } else {
        config.ssl = {
          rejectUnauthorized: false,
        };
        console.log('Using GCP Cloud SQL TCP connection with SSL');
      }
    }

    return config;
  }

  private isCloudSqlConnection(url: string): boolean {
    return url.includes('/cloudsql/') || url.includes('PROJECT_ID:REGION:INSTANCE');
  }

  private logConnectionInfo(): void {
    const env = process.env.NODE_ENV || 'development';
    const databaseUrl = process.env.DATABASE_URL || '';

    let hostInfo = 'unknown';
    if (databaseUrl.includes('localhost')) {
      hostInfo = 'localhost (local PostgreSQL)';
    } else if (databaseUrl.includes('/cloudsql/')) {
      hostInfo = 'GCP Cloud SQL (Unix socket)';
    } else if (databaseUrl.includes('@')) {
      const match = databaseUrl.match(/@([^/]+)/);
      hostInfo = match ? `${match[1]} (GCP Cloud SQL)` : 'GCP Cloud SQL';
    }

    console.log(`Database connection initialized:`);
    console.log(`  Environment: ${env}`);
    console.log(`  Host: ${hostInfo}`);
    console.log(`  Pool: ${this.pool.options.min}-${this.pool.options.max} connections`);
  }

  public async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection test successful:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    console.log('Database connection pool closed');
  }

  public getDb() {
    return this.db;
  }

  public getPool(): Pool {
    return this.pool;
  }
}

export const dbConnection = DatabaseConnection.getInstance();
export const db = dbConnection.getDb();
