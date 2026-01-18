# Deployment - Video Frames Editor

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Railway Project                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  Frontend   │  │   Backend   │  │   PostgreSQL    │ │
│  │  (Next.js)  │  │  (Fastify)  │  │   (Database)    │ │
│  │  Port 3000  │  │  Port 4000  │  │   Port 5432     │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Railway Setup

### 1. Create Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
```

### 2. Create Services

In Railway dashboard:
1. Create **PostgreSQL** database (Add → Database → PostgreSQL)
2. Create **Backend** service (Add → GitHub Repo → select backend folder)
3. Create **Frontend** service (Add → GitHub Repo → select frontend folder)

---

## Backend Configuration

### Dockerfile

```dockerfile
# backend/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

ENV NODE_ENV=production

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

### railway.toml

```toml
# backend/railway.toml

[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "on-failure"
restartPolicyMaxRetries = 3
```

### package.json scripts

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio"
  }
}
```

---

## Frontend Configuration

### Dockerfile

```dockerfile
# frontend/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
```

### next.config.js

```javascript
// frontend/next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['res.cloudinary.com'],
  },
};

module.exports = nextConfig;
```

### railway.toml

```toml
# frontend/railway.toml

[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/"
healthcheckTimeout = 100
```

---

## Environment Variables

### Backend (Railway Dashboard)

| Variable | Value | Note |
|----------|-------|------|
| `DATABASE_URL` | Auto-set by Railway | Links to PostgreSQL |
| `JWT_SECRET` | Generate random 32+ chars | `openssl rand -base64 32` |
| `OPENAI_API_KEY` | `sk-...` | From OpenAI dashboard |
| `CLOUDINARY_CLOUD_NAME` | Your cloud name | From Cloudinary |
| `CLOUDINARY_API_KEY` | API key | From Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret | From Cloudinary |
| `FRONTEND_URL` | `https://frontend-xxx.railway.app` | For CORS |
| `PORT` | `4000` | Fastify port |
| `NODE_ENV` | `production` | |

### Frontend (Railway Dashboard)

| Variable | Value | Note |
|----------|-------|------|
| `NEXT_PUBLIC_API_URL` | `https://backend-xxx.railway.app` | Backend URL |

---

## Database Migrations

### Initial Setup

```bash
# Local development
npx prisma migrate dev --name init

# This creates migration files in prisma/migrations/
```

### Production Deploy

Migrations run automatically via Dockerfile CMD:
```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

### Manual Migration (if needed)

```bash
# Connect to Railway
railway link

# Run migration
railway run npx prisma migrate deploy
```

---

## Networking

### Backend Service Variables

```bash
# Railway auto-generates internal URL
# Use this for service-to-service communication
RAILWAY_PRIVATE_DOMAIN=backend.railway.internal

# Public URL (auto-generated)
RAILWAY_PUBLIC_DOMAIN=backend-xxx.railway.app
```

### CORS Configuration

```typescript
// src/index.ts

app.register(cors, {
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',  // for local dev
  ],
  credentials: true,
});
```

---

## Custom Domain (Optional)

1. Go to Railway service settings
2. Click "Custom Domain"
3. Add your domain (e.g., `api.yourdomain.com`)
4. Update DNS with provided CNAME
5. Update `FRONTEND_URL` env var in backend
6. Update `NEXT_PUBLIC_API_URL` in frontend

---

## Monitoring

### Health Check Endpoint

```typescript
// src/index.ts

app.get('/health', async () => {
  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'connected' };
  } catch (error) {
    return { status: 'error', database: 'disconnected' };
  }
});
```

### Logging

```typescript
// Fastify auto-logs requests
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});
```

### Railway Logs

```bash
# View logs via CLI
railway logs

# Or in Railway dashboard → Service → Logs
```

---

## Deployment Workflow

### Automatic (Recommended)

1. Push to `main` branch
2. Railway auto-detects changes
3. Builds and deploys automatically

### Manual

```bash
# Deploy via CLI
railway up
```

---

## Rollback

1. Go to Railway dashboard
2. Select service → Deployments
3. Click on previous deployment
4. Click "Rollback"

---

## Cost Estimation

| Service | Free Tier | Estimated Monthly |
|---------|-----------|-------------------|
| Railway Starter | $5 credit | ~$5-10 |
| PostgreSQL | Included | ~$0-5 |
| Total Railway | - | ~$5-15 |
| Cloudinary | 25GB free | $0 |
| OpenAI | Pay per use | ~$5-50 |

**Total: ~$10-65/month** (depending on usage)

---

## Troubleshooting

### Database Connection Fails

```bash
# Check DATABASE_URL is set
railway variables

# Test connection
railway run npx prisma db pull
```

### Build Fails

```bash
# Check build logs
railway logs --build

# Common issues:
# - Missing dependencies in package.json
# - TypeScript errors
# - Missing environment variables during build
```

### Health Check Fails

```bash
# Verify endpoint works locally
curl http://localhost:4000/health

# Check Railway logs for errors
railway logs
```
