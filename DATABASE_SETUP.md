# Database Setup Guide

## Local Development (Docker)

### Prerequisites

- Docker Desktop installed
- Docker Compose installed (included with Docker Desktop)

### Quick Start

#### 1. Start Database Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL 15 on port 5432
- Redis 7 on port 6379

#### 2. Configure Environment

```bash
cp .env.example .env
```

The default `.env` is already configured for Docker:
```
NODE_ENV=development
DATABASE_URL=postgresql://tweettune_user:tweettune_dev_password@localhost:5432/tweettune
```

#### 3. Install Dependencies

```bash
npm install
```

#### 4. Generate and Run Migrations

```bash
npm run db:generate
npm run db:migrate
```

#### 5. Test Connection

```bash
npm run dev
```

### Docker Management

#### View Container Status

```bash
docker-compose ps
```

#### View Logs

```bash
docker-compose logs -f postgres
docker-compose logs -f redis
```

#### Stop Services

```bash
docker-compose down
```

#### Stop and Remove Volumes (Reset Database)

```bash
docker-compose down -v
```

#### Restart Services

```bash
docker-compose restart
```

### Access PostgreSQL Shell

```bash
docker-compose exec postgres psql -U tweettune_user -d tweettune
```

---

## Production (GCP Cloud SQL)

### 1. Create Cloud SQL Instance

```bash
gcloud sql instances create tweettune-prod \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

### 2. Create Database

```bash
gcloud sql databases create tweettune --instance=tweettune-prod
```

### 3. Set Root Password

```bash
gcloud sql users set-password postgres \
  --instance=tweettune-prod \
  --password=YOUR_SECURE_PASSWORD
```

### 4. Configure Connection

**Option A: Unix Socket (recommended for Cloud Run/GCE)**

```bash
DATABASE_URL=postgresql://postgres:PASSWORD@/tweettune?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

**Option B: TCP Connection**

```bash
gcloud sql instances describe tweettune-prod --format="value(ipAddresses[0].ipAddress)"

DATABASE_URL=postgresql://postgres:PASSWORD@INSTANCE_IP:5432/tweettune
```

### 5. Whitelist IP (TCP only)

```bash
gcloud sql instances patch tweettune-prod \
  --authorized-networks=YOUR_IP_ADDRESS
```

### 6. Run Migrations

```bash
NODE_ENV=production npm run db:migrate
```

---

## Database Management

### View Database with Drizzle Studio

```bash
npm run db:studio
```

### Reset Database (Development Only)

```bash
docker-compose down -v
docker-compose up -d
npm run db:migrate
```

### Backup Database

**Local (Docker)**
```bash
docker-compose exec postgres pg_dump -U tweettune_user tweettune > backup.sql
```

**GCP**
```bash
gcloud sql export sql tweettune-prod gs://YOUR_BUCKET/backup.sql \
  --database=tweettune
```

### Restore Database

**Local (Docker)**
```bash
cat backup.sql | docker-compose exec -T postgres psql -U tweettune_user -d tweettune
```

**GCP**
```bash
gcloud sql import sql tweettune-prod gs://YOUR_BUCKET/backup.sql \
  --database=tweettune
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string | See examples above |
| `DB_POOL_MIN` | Minimum pool connections | `2` |
| `DB_POOL_MAX` | Maximum pool connections | `10` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

---

## Troubleshooting

### Container Won't Start

Check if ports are already in use:
```bash
netstat -ano | findstr :5432
netstat -ano | findstr :6379
```

Stop conflicting services or change ports in `docker-compose.yml`

### Connection Refused

Ensure containers are running:
```bash
docker-compose ps
```

Check container health:
```bash
docker-compose logs postgres
```

### Database Already Exists Error

```bash
docker-compose down -v
docker-compose up -d
```

### GCP Connection Issues

Use Cloud SQL Proxy for local testing:
```bash
cloud_sql_proxy -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:5432
```

Then use:
```bash
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/tweettune
```

### Permission Denied on Windows

Run Docker Desktop as Administrator
