# Requirements - Video Frames Editor

## Environment Variables

### Backend

```bash
# .env

# ============ DATABASE ============
DATABASE_URL=postgresql://user:password@localhost:5432/video_frames_editor

# ============ AUTH ============
JWT_SECRET=your-super-secret-key-min-32-characters-long

# ============ IMAGE GENERATION ============
# Choose provider: openai-gpt-image (default), openai, replicate-flux, replicate-sdxl, stability
IMAGE_PROVIDER=openai-gpt-image

# OpenAI (required if IMAGE_PROVIDER starts with 'openai')
OPENAI_API_KEY=sk-...

# Replicate (required if IMAGE_PROVIDER starts with 'replicate')
REPLICATE_API_TOKEN=r8_...

# Stability (required if IMAGE_PROVIDER is 'stability')
STABILITY_API_KEY=sk-...

# ============ CLOUDINARY ============
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your-api-secret

# ============ ANTHROPIC (for testing) ============
ANTHROPIC_API_KEY=sk-ant-...

# ============ SERVER ============
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend

```bash
# .env.local

NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Backend Dependencies

### package.json

```json
{
  "name": "video-frames-editor-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@fastify/jwt": "^8.0.0",
    "@prisma/client": "^5.10.0",
    "bcrypt": "^5.1.1",
    "cloudinary": "^2.0.0",
    "fastify": "^4.26.0",
    "fastify-plugin": "^4.5.1",
    "openai": "^4.28.0",
    "replicate": "^0.25.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@anthropic-ai/sdk": "^0.18.0",
    "@types/bcrypt": "^5.0.2",
    "@types/node": "^20.11.0",
    "prisma": "^5.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.3.0"
  }
}
```

### Dependencies Explained

| Package | Purpose |
|---------|---------|
| `fastify` | Web framework |
| `@fastify/cors` | CORS handling |
| `@fastify/jwt` | JWT authentication |
| `@prisma/client` | Database ORM |
| `bcrypt` | Password hashing |
| `cloudinary` | Image/video storage |
| `openai` | OpenAI DALL-E / GPT-Image |
| `replicate` | Replicate (FLUX, SDXL) |
| `zod` | Schema validation |
| `@anthropic-ai/sdk` | Image evaluation (dev) |

---

## Frontend Dependencies

### package.json

```json
{
  "name": "video-frames-editor-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@tanstack/react-query": "^5.24.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.344.0",
    "next": "^14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.50.0",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.18",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.1.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.0"
  }
}
```

### Dependencies Explained

| Package | Purpose |
|---------|---------|
| `next` | React framework |
| `@tanstack/react-query` | Server state management |
| `zustand` | Client state management |
| `react-hook-form` | Form handling |
| `zod` | Form validation |
| `@radix-ui/*` | Headless UI components (shadcn) |
| `lucide-react` | Icons |
| `tailwindcss` | Styling |
| `clsx`, `tailwind-merge` | Class utilities |

---

## Node.js Version

```
Node.js >= 20.0.0
npm >= 10.0.0
```

### .nvmrc

```
20
```

---

## TypeScript Configuration

### Backend tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Frontend tsconfig.json

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## External Services Setup

### OpenAI

1. Go to https://platform.openai.com
2. Create account / login
3. Go to API Keys
4. Create new key
5. Copy to `OPENAI_API_KEY`

### Cloudinary

1. Go to https://cloudinary.com
2. Create free account
3. Go to Dashboard
4. Copy:
   - Cloud Name → `CLOUDINARY_CLOUD_NAME`
   - API Key → `CLOUDINARY_API_KEY`
   - API Secret → `CLOUDINARY_API_SECRET`

### Anthropic (for testing)

1. Go to https://console.anthropic.com
2. Create account / login
3. Go to API Keys
4. Create new key
5. Copy to `ANTHROPIC_API_KEY`

---

## Local Development Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd video-frames-editor

# 2. Install backend dependencies
cd backend
npm install

# 3. Setup database
# Start PostgreSQL (Docker recommended)
docker run --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:16

# 4. Create .env file
cp .env.example .env
# Edit .env with your values

# 5. Run migrations
npm run db:migrate

# 6. Start backend
npm run dev

# 7. Install frontend dependencies (new terminal)
cd ../frontend
npm install

# 8. Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > .env.local

# 9. Start frontend
npm run dev

# 10. Open http://localhost:3000
```

---

## Docker Development (Optional)

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: video_frames_editor
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/video_frames_editor
      JWT_SECRET: dev-secret-key-for-local-development
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
      FRONTEND_URL: http://localhost:3000
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000

volumes:
  postgres_data:
```

```bash
# Run with Docker
docker-compose up -d
```
