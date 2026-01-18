# Development Plan - Video Frames Editor

## Overview

MVP-first approach: Build complete UI with mocks, then gradually connect real services.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Development Flow                                   │
│                                                                              │
│  Phase 1              Phase 2                                                │
│  UI + Mocks           API + Gradual Integration                              │
│  ┌─────────┐          ┌─────────┬─────────┬─────────┬─────────┐             │
│  │ Next.js │          │  2.0    │  2.1    │  2.2    │  2.3    │             │
│  │ mockApi │    →     │ All     │ OpenAI  │ Cloud-  │ Postgre │             │
│  │ .ts     │          │ Mocked  │ REAL    │ inary   │ SQL     │             │
│  └────┬────┘          └────┬────┴────┬────┴────┬────┴────┬────┘             │
│       ▼                    ▼         ▼         ▼         ▼                   │
│  [DEPLOY]             [DEPLOY]  [DEPLOY]  [DEPLOY]  [DEPLOY]                │
│       ▼                    ▼         ▼         ▼         ▼                   │
│  [VALIDATE UX]        [TEST]    [TEST]    [TEST]    [TEST]                  │
│       ✓                    ✓         ✓         ✓         ✓                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Principle:** UI has zero mocks after Phase 1. All mocking lives in API layer.

---

## Phase 1: UI with Mock Data

**Goal:** Complete, working UI with hardcoded data. No HTTP calls.

### Approach
- UI imports `mockApi.ts` directly
- Returns hardcoded/random data
- All pages and interactions work
- Deploy to Railway as Next.js app

### Deliverables
- [ ] Next.js project setup
- [ ] Mock data service (`src/lib/mockApi.ts`)
- [ ] All pages working with mock data
- [ ] Deploy to Railway

### Pages
```
/                      → Redirect to /projects
/projects              → List projects, create new
/projects/[id]         → Project detail with videos list
/videos/[id]           → Video editor (frames + context + chat)
/projects/[id]/gallery → Gallery page
```

### Mock Data Structure
```typescript
// src/lib/mockApi.ts

export const mockApi = {
  projects: {
    list: () => [...],
    get: (id) => {...},
    create: (name) => {...},
    delete: (id) => {...},
  },
  videos: {
    list: (projectId) => [...],
    get: (id) => {...},
    create: (projectId, name) => {...},
    delete: (id) => {...},
  },
  frames: {
    list: (videoId) => [...],
    create: (videoId, title) => {...},
    reorder: (frameId, newOrder) => [...],
    delete: (id) => {...},
  },
  context: {
    get: (videoId) => {...},
    update: (videoId, content) => {...},
  },
  generate: {
    // Returns random picsum.photos URLs
    images: (frameId, prompt) => [...],
  },
  images: {
    select: (frameId, imageId) => {...},
    delete: (id) => {...},
  },
};
```

### Exit Criteria
- [ ] All pages render correctly
- [ ] Navigation works
- [ ] CRUD operations work (in memory)
- [ ] Image generation shows placeholder images
- [ ] Frame reordering works
- [ ] Context editing works
- [ ] User validates UX in browser

---

## Phase 2: API with Gradual Integration

**Goal:** Real API, gradually replacing mocks with real services.

### Phase 2.0: API with All Mocks

**Goal:** Real HTTP endpoints, but all external services mocked.

| Service | Status |
|---------|--------|
| OpenAI | MOCK |
| Cloudinary | MOCK |
| PostgreSQL | MOCK |

#### Deliverables
- [ ] Fastify API setup
- [ ] All endpoints implemented
- [ ] Mock providers for all services
- [ ] UI switches from `mockApi.ts` to real HTTP calls
- [ ] Deploy API to Railway

#### Mock Implementations
```typescript
// Mock Image Generation Provider
class MockImageProvider implements ImageGenerationProvider {
  async generate(options) {
    return Array(4).fill(null).map((_, i) => ({
      url: `https://picsum.photos/seed/${Date.now()}-${i}/1792/1024`,
      storageId: `mock-${Date.now()}-${i}`,
      provider: 'mock',
      model: 'mock',
    }));
  }
}

// Mock Storage Provider
class MockStorageProvider implements StorageProvider {
  async uploadBase64(data) {
    return {
      url: `https://picsum.photos/seed/${Date.now()}/800/600`,
      storageId: `mock-${Date.now()}`,
      provider: 'mock',
    };
  }
  async delete(id) { /* no-op */ }
}

// Mock Database (in-memory)
const mockDb = {
  projects: new Map(),
  videos: new Map(),
  frames: new Map(),
  // ...
};
```

#### Exit Criteria
- [ ] All API endpoints return correct responses
- [ ] UI works with real HTTP calls
- [ ] No external service costs

---

### Phase 2.1: Real OpenAI

**Goal:** Connect real OpenAI, keep other services mocked.

| Service | Status |
|---------|--------|
| OpenAI | **REAL** |
| Cloudinary | MOCK |
| PostgreSQL | MOCK |

#### Deliverables
- [ ] OpenAI provider implementation
- [ ] Environment variable: `OPENAI_API_KEY`
- [ ] Test with real image generation

#### Changes
```typescript
// Switch provider in config
const imageProvider = process.env.OPENAI_API_KEY
  ? new OpenAIProvider()
  : new MockImageProvider();
```

#### Exit Criteria
- [ ] Real images generated from prompts
- [ ] Images stored temporarily (mock storage returns picsum URLs)
- [ ] ~$1-2 spent testing

---

### Phase 2.2: Real Cloudinary

**Goal:** Connect real Cloudinary, database still mocked.

| Service | Status |
|---------|--------|
| OpenAI | REAL |
| Cloudinary | **REAL** |
| PostgreSQL | MOCK |

#### Deliverables
- [ ] Cloudinary provider implementation
- [ ] Environment variables: `CLOUDINARY_*`
- [ ] Generated images uploaded to Cloudinary

#### Changes
```typescript
// Switch provider in config
const storageProvider = process.env.CLOUDINARY_CLOUD_NAME
  ? new CloudinaryStorage()
  : new MockStorageProvider();
```

#### Exit Criteria
- [ ] Images persist in Cloudinary
- [ ] URLs are permanent CDN links
- [ ] Delete works

---

### Phase 2.3: Real PostgreSQL

**Goal:** Full production system with real database.

| Service | Status |
|---------|--------|
| OpenAI | REAL |
| Cloudinary | REAL |
| PostgreSQL | **REAL** |

#### Deliverables
- [ ] Prisma setup
- [ ] Database migrations
- [ ] Railway PostgreSQL
- [ ] Replace mock DB with Prisma

#### Changes
```typescript
// Use Prisma instead of mock
import { prisma } from './plugins/prisma';

// All routes now use prisma.project.findMany(), etc.
```

#### Exit Criteria
- [ ] Data persists across restarts
- [ ] All CRUD operations work
- [ ] Cascade deletes work
- [ ] Full production system running

---

## Future Phases

### Phase 3: Authentication (DISABLED)
- JWT-based auth
- User isolation
- Protected routes

### Phase 4: Video Export (DISABLED)
- Cloudinary video generation
- Export progress tracking

---

## Summary

| Phase | OpenAI | Cloudinary | PostgreSQL | UI Source |
|-------|--------|------------|------------|-----------|
| 1 | - | - | - | mockApi.ts |
| 2.0 | mock | mock | mock | HTTP calls |
| 2.1 | **REAL** | mock | mock | HTTP calls |
| 2.2 | real | **REAL** | mock | HTTP calls |
| 2.3 | real | real | **REAL** | HTTP calls |

### Workflow

```
Phase 1:
1. Claude builds UI with mockApi.ts
2. Deploy to Railway
3. User validates UX
4. Iterate until satisfied

Phase 2.x:
1. Claude builds/updates API
2. Deploy to Railway
3. Test specific service integration
4. Move to next sub-phase
```

---

## Environment Variables by Phase

### Phase 1
```bash
# Frontend only - no env vars needed
```

### Phase 2.0
```bash
# Backend
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
# All services mocked - no API keys needed
```

### Phase 2.1
```bash
# Add OpenAI
OPENAI_API_KEY=sk-...
IMAGE_PROVIDER=openai-gpt-image
```

### Phase 2.2
```bash
# Add Cloudinary
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Phase 2.3
```bash
# Add PostgreSQL
DATABASE_URL=postgresql://...
```
