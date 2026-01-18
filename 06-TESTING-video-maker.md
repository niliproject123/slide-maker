# Testing Plan - Video Frames Editor

## Overview

Dual-environment testing strategy:

| Environment | Database | External APIs | E2E |
|-------------|----------|---------------|-----|
| **Claude Code VM** | SQLite (sql.js) | Mocked | ❌ |
| **Local (Claude Code CLI)** | PostgreSQL (Prisma) | Real | ✅ |
| **CI/GitHub Actions** | PostgreSQL | Real | ✅ |

```
┌─────────────────────────────────────────────────────────┐
│                 Shared Test Interface                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────┐       ┌─────────────────┐        │
│   │  SQLite Adapter │       │  Prisma Adapter │        │
│   │    (sql.js)     │       │  (PostgreSQL)   │        │
│   └────────┬────────┘       └────────┬────────┘        │
│            │                         │                  │
│            └───────────┬─────────────┘                  │
│                        ▼                                │
│              ┌─────────────────┐                        │
│              │   DbAdapter     │  ← Same interface      │
│              │   Interface     │                        │
│              └────────┬────────┘                        │
│                       ▼                                 │
│              ┌─────────────────┐                        │
│              │   Test Suite    │  ← Same tests          │
│              └─────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
backend/
├── tests/
│   ├── helpers/
│   │   ├── db-adapter.ts        # Abstraction layer (both DBs)
│   │   ├── image-mocks.ts       # Mock image providers
│   │   └── api-setup.ts         # Fastify inject helpers
│   ├── database.test.ts         # DB tests (both envs)
│   ├── api.test.ts              # API tests (both envs)
│   ├── validation.test.ts       # Pure unit tests
│   ├── image-generation.test.ts # Real API (local only)
│   ├── image-evaluation.test.ts # Claude API (local only)
│   └── e2e/
│       └── smoke.test.ts        # Full flow (local only)
├── vitest.config.ts
└── package.json
```

---

## 1. Database Adapter (Core)

This abstraction allows same tests to run against both SQLite and PostgreSQL.

### Types

```typescript
// tests/helpers/db-adapter.ts

export interface User {
  id: string;
  email: string;
  password: string;
}

export interface Project {
  id: string;
  name: string;
  userId: string;
}

export interface Video {
  id: string;
  name: string;
  projectId: string;
}

export interface Frame {
  id: string;
  title: string;
  order: number;
  videoId: string;
  selectedImageId?: string | null;
}

export interface Message {
  id: string;
  prompt: string;
  withContext: boolean;
  frameId?: string | null;
}

export interface Image {
  id: string;
  url: string;
  cloudinaryId: string;
  messageId: string;
}
```

### Adapter Interface

```typescript
export interface DbAdapter {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reset(): Promise<void>;
  
  // Users
  createUser(data: { email: string; password: string }): Promise<User>;
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  deleteUser(id: string): Promise<void>;
  
  // Projects
  createProject(data: { name: string; userId: string }): Promise<Project>;
  findProjectById(id: string): Promise<Project | null>;
  findProjectsByUser(userId: string): Promise<Project[]>;
  deleteProject(id: string): Promise<void>;
  
  // Videos
  createVideo(data: { name: string; projectId: string }): Promise<Video>;
  findVideoById(id: string): Promise<Video | null>;
  findVideosByProject(projectId: string): Promise<Video[]>;
  deleteVideo(id: string): Promise<void>;
  
  // Frames
  createFrame(data: { title: string; order: number; videoId: string }): Promise<Frame>;
  findFrameById(id: string): Promise<Frame | null>;
  findFramesByVideo(videoId: string): Promise<Frame[]>;
  updateFrameOrder(id: string, newOrder: number): Promise<void>;
  setSelectedImage(frameId: string, imageId: string | null): Promise<void>;
  deleteFrame(id: string): Promise<void>;
  
  // Messages & Images
  createMessage(data: { prompt: string; withContext: boolean; frameId?: string }): Promise<Message>;
  findMessagesByFrame(frameId: string): Promise<Message[]>;
  createImage(data: { url: string; cloudinaryId: string; messageId: string }): Promise<Image>;
  findImagesByMessage(messageId: string): Promise<Image[]>;
  
  // Complex queries
  getFramesForExport(videoId: string): Promise<Array<{
    frameId: string;
    title: string;
    order: number;
    imageUrl: string;
    cloudinaryId: string;
  }>>;
}
```

### SQLite Adapter (Claude Code VM)

```typescript
import initSqlJs, { Database } from 'sql.js';

export class SqliteAdapter implements DbAdapter {
  private db: Database | null = null;
  
  async connect(): Promise<void> {
    const SQL = await initSqlJs();
    this.db = new SQL.Database();
    this.db.run('PRAGMA foreign_keys = ON');
    
    // Create tables
    this.db.run(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )
    `);
    
    this.db.run(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        user_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    this.db.run(`
      CREATE TABLE videos (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        project_id TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);
    
    this.db.run(`
      CREATE TABLE frames (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        video_id TEXT NOT NULL,
        selected_image_id TEXT,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
      )
    `);
    
    this.db.run(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        with_context INTEGER DEFAULT 0,
        frame_id TEXT,
        FOREIGN KEY (frame_id) REFERENCES frames(id) ON DELETE CASCADE
      )
    `);
    
    this.db.run(`
      CREATE TABLE images (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        cloudinary_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);
  }
  
  async disconnect(): Promise<void> {
    this.db?.close();
  }
  
  async reset(): Promise<void> {
    // Delete in order respecting foreign keys
    this.db!.run('DELETE FROM images');
    this.db!.run('DELETE FROM messages');
    this.db!.run('DELETE FROM frames');
    this.db!.run('DELETE FROM videos');
    this.db!.run('DELETE FROM projects');
    this.db!.run('DELETE FROM users');
  }
  
  // ... implement all interface methods using this.db.run() and this.db.exec()
}
```

### Prisma Adapter (Local/CI)

```typescript
import { PrismaClient } from '@prisma/client';

export class PrismaAdapter implements DbAdapter {
  private prisma: PrismaClient | null = null;
  
  async connect(): Promise<void> {
    this.prisma = new PrismaClient();
    await this.prisma.$connect();
  }
  
  async disconnect(): Promise<void> {
    await this.prisma?.$disconnect();
  }
  
  async reset(): Promise<void> {
    await this.prisma!.image.deleteMany();
    await this.prisma!.message.deleteMany();
    await this.prisma!.frame.deleteMany();
    await this.prisma!.video.deleteMany();
    await this.prisma!.project.deleteMany();
    await this.prisma!.user.deleteMany();
  }
  
  async createUser(data: { email: string; password: string }) {
    return this.prisma!.user.create({ data });
  }
  
  // ... implement all interface methods using this.prisma
}
```

### Factory

```typescript
export type DbType = 'sqlite' | 'prisma';

export function createDbAdapter(type?: DbType): DbAdapter {
  const adapterType = type || process.env.DB_ADAPTER || 'sqlite';
  
  if (adapterType === 'prisma') {
    return new PrismaAdapter();
  }
  return new SqliteAdapter();
}
```

---

## 2. Database Tests (Both Environments)

```typescript
// tests/database.test.ts

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { DbAdapter, createDbAdapter } from './helpers/db-adapter';

let db: DbAdapter;

beforeAll(async () => {
  db = createDbAdapter(); // Auto-detects environment
  await db.connect();
  console.log(`Using: ${db.constructor.name}`);
});

beforeEach(async () => {
  await db.reset();
});

afterAll(async () => {
  await db.disconnect();
});

describe('User Operations', () => {
  it('should create user', async () => {
    const user = await db.createUser({ 
      email: 'test@example.com', 
      password: 'hashed' 
    });
    expect(user.email).toBe('test@example.com');
  });

  it('should reject duplicate email', async () => {
    await db.createUser({ email: 'dup@test.com', password: 'hash' });
    await expect(
      db.createUser({ email: 'dup@test.com', password: 'hash' })
    ).rejects.toThrow();
  });
});

describe('Cascade Deletes', () => {
  it('should delete videos when project deleted', async () => {
    const user = await db.createUser({ email: 'u@t.com', password: 'h' });
    const project = await db.createProject({ name: 'P', userId: user.id });
    await db.createVideo({ name: 'V1', projectId: project.id });
    await db.createVideo({ name: 'V2', projectId: project.id });
    
    await db.deleteProject(project.id);
    
    const videos = await db.findVideosByProject(project.id);
    expect(videos.length).toBe(0);
  });

  it('should cascade delete entire tree', async () => {
    const user = await db.createUser({ email: 'u@t.com', password: 'h' });
    const project = await db.createProject({ name: 'P', userId: user.id });
    const video = await db.createVideo({ name: 'V', projectId: project.id });
    const frame = await db.createFrame({ title: 'F', order: 0, videoId: video.id });
    const message = await db.createMessage({ prompt: 'p', withContext: false, frameId: frame.id });
    await db.createImage({ url: 'u', cloudinaryId: 'c', messageId: message.id });
    
    await db.deleteProject(project.id);
    
    expect(await db.findVideoById(video.id)).toBeNull();
    expect(await db.findFrameById(frame.id)).toBeNull();
  });
});

describe('Frame Ordering', () => {
  it('should reorder frames', async () => {
    const user = await db.createUser({ email: 'u@t.com', password: 'h' });
    const project = await db.createProject({ name: 'P', userId: user.id });
    const video = await db.createVideo({ name: 'V', projectId: project.id });
    
    await db.createFrame({ title: 'A', order: 0, videoId: video.id });
    await db.createFrame({ title: 'B', order: 1, videoId: video.id });
    const frameC = await db.createFrame({ title: 'C', order: 2, videoId: video.id });
    
    await db.updateFrameOrder(frameC.id, 0);
    
    const frames = await db.findFramesByVideo(video.id);
    expect(frames.map(f => f.title)).toEqual(['C', 'A', 'B']);
  });
});

describe('Export Query', () => {
  it('should get frames with selected images', async () => {
    const user = await db.createUser({ email: 'u@t.com', password: 'h' });
    const project = await db.createProject({ name: 'P', userId: user.id });
    const video = await db.createVideo({ name: 'V', projectId: project.id });
    
    const frame1 = await db.createFrame({ title: 'F1', order: 0, videoId: video.id });
    const msg1 = await db.createMessage({ prompt: 'p', withContext: false, frameId: frame1.id });
    const img1 = await db.createImage({ url: 'url1', cloudinaryId: 'cld1', messageId: msg1.id });
    await db.setSelectedImage(frame1.id, img1.id);
    
    // Frame without selected image
    await db.createFrame({ title: 'F2', order: 1, videoId: video.id });
    
    const exportData = await db.getFramesForExport(video.id);
    
    expect(exportData.length).toBe(1);
    expect(exportData[0].cloudinaryId).toBe('cld1');
  });
});
```

---

## 3. API Tests (Both Environments)

```typescript
// tests/api.test.ts

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import { createDbAdapter } from './helpers/db-adapter';

let app: FastifyInstance;
let token: string;

beforeAll(async () => {
  // Set up DB adapter for the app
  process.env.DB_ADAPTER = process.env.DB_ADAPTER || 'sqlite';
  app = await buildApp();
});

beforeEach(async () => {
  // Reset and create test user
  const db = createDbAdapter();
  await db.connect();
  await db.reset();
  await db.disconnect();
  
  // Get auth token
  const res = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { email: `test-${Date.now()}@test.com`, password: 'password123' },
  });
  token = JSON.parse(res.body).token;
});

afterAll(async () => {
  await app.close();
});

describe('Projects API', () => {
  it('POST /projects should create project', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Test Project' },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).name).toBe('Test Project');
  });

  it('GET /projects should return user projects', async () => {
    await app.inject({
      method: 'POST',
      url: '/projects',
      headers: { Authorization: `Bearer ${token}` },
      payload: { name: 'Project 1' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/projects',
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).length).toBe(1);
  });
});
```

---

## 4. Image Generation Tests

### Mock Provider (Claude Code VM)

```typescript
// tests/helpers/image-mocks.ts

import { ImageGenerationProvider, ImageGenerationResult } from '../../src/services/image-generation/types';

export class MockImageProvider implements ImageGenerationProvider {
  name = 'mock';
  
  async generate(options: { prompt: string; count?: number }): Promise<ImageGenerationResult[]> {
    const count = options.count || 4;
    return Array(count).fill(null).map((_, i) => ({
      url: `https://mock-cdn.test/image-${i}-${Date.now()}.png`,
      provider: 'mock',
      model: 'mock-v1',
    }));
  }
}
```

### Real Provider Tests (Local Only)

```typescript
// tests/image-generation.test.ts

import { describe, it, expect } from 'vitest';
import { getImageProvider } from '../src/services/image-generation';

// Skip in Claude Code VM (no network access to OpenAI)
const isClaudeCodeVM = !process.env.OPENAI_API_KEY;

describe.skipIf(isClaudeCodeVM)('Image Generation (Real API)', () => {
  it('should generate image with GPT-Image', async () => {
    const provider = getImageProvider('openai-gpt-image');
    const images = await provider.generate({
      prompt: 'a red circle on white background',
      count: 1,
    });

    expect(images.length).toBe(1);
    expect(images[0].url).toMatch(/^https:\/\//);
  }, 60000);
});
```

---

## 5. Image Quality Evaluation (Local Only)

```typescript
// tests/image-evaluation.test.ts

import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { getImageProvider } from '../src/services/image-generation';

const isClaudeCodeVM = !process.env.ANTHROPIC_API_KEY;

describe.skipIf(isClaudeCodeVM)('Image Quality Evaluation', () => {
  const anthropic = new Anthropic();

  async function evaluateImage(prompt: string, imageUrl: string) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          { type: 'text', text: `Rate 1-5 how well this image matches: "${prompt}". Return JSON: {"score": N, "reason": "..."}` },
        ],
      }],
    });
    return JSON.parse(response.content[0].type === 'text' ? response.content[0].text : '{}');
  }

  it('should generate matching image', async () => {
    const prompt = 'a red apple on a wooden table';
    const provider = getImageProvider();
    const [image] = await provider.generate({ prompt, count: 1 });
    
    const evaluation = await evaluateImage(prompt, image.url);
    
    expect(evaluation.score).toBeGreaterThanOrEqual(3);
  }, 120000);
});
```

---

## 6. E2E Tests (Local Only - Playwright)

```typescript
// tests/e2e/smoke.test.ts (Playwright)

import { test, expect } from '@playwright/test';

test.describe('Full User Flow', () => {
  test('should complete signup → create project → create video → add frame', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    
    // Signup
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/projects');
    
    // Create project
    await page.click('button:has-text("+ New")');
    await page.fill('input[name="name"]', 'Test Project');
    await page.click('button:has-text("Create")');
    await page.click('text=Test Project');
    
    // Create video
    await page.click('button:has-text("+ New")');
    await page.fill('input[name="name"]', 'Test Video');
    await page.click('button:has-text("Create")');
    await page.click('text=Test Video');
    
    // Create frame
    await page.click('button:has-text("Add Frame")');
    await page.fill('input[name="title"]', 'Scene 1');
    await page.click('button:has-text("Create")');
    
    await expect(page.locator('text=Scene 1')).toBeVisible();
  });
});
```

---

## Running Tests

### Claude Code VM (SQLite)

```bash
# All tests that work in VM
npx vitest run

# Output:
# Using: SqliteAdapter
# ✓ tests/database.test.ts (20 tests)
# ✓ tests/validation.test.ts (8 tests)
# ○ tests/image-generation.test.ts (skipped - no API key)
# ○ tests/image-evaluation.test.ts (skipped - no API key)
```

### Local Machine (PostgreSQL)

```bash
# Set adapter and run
DB_ADAPTER=prisma npx vitest run

# Or with real APIs
DB_ADAPTER=prisma \
OPENAI_API_KEY=sk-... \
ANTHROPIC_API_KEY=sk-ant-... \
npx vitest run

# E2E with Playwright
npx playwright test
```

### CI/GitHub Actions

```yaml
# .github/workflows/test.yml

name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
        working-directory: ./backend
      
      - name: Run migrations
        run: npx prisma migrate deploy
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run tests
        run: npx vitest run
        working-directory: ./backend
        env:
          DB_ADAPTER: prisma
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

---

## Vitest Config

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 30000,
    globals: true,
  },
});
```

---

## Environment Variables

```bash
# .env.test

# Database adapter: 'sqlite' (default) or 'prisma'
DB_ADAPTER=sqlite

# PostgreSQL (when using prisma adapter)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/video_frames_test

# Image generation (optional - tests skip if missing)
OPENAI_API_KEY=sk-...

# Image evaluation (optional - tests skip if missing)
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Summary

| Test Type | Claude Code VM | Local | CI |
|-----------|----------------|-------|-----|
| Database (SQLite) | ✅ | ✅ | - |
| Database (Prisma) | - | ✅ | ✅ |
| API endpoints | ✅ | ✅ | ✅ |
| Validation/Logic | ✅ | ✅ | ✅ |
| Image Generation | ❌ skipped | ✅ | ✅ |
| Image Evaluation | ❌ skipped | ✅ | ⚠️ weekly |
| E2E (Playwright) | ❌ | ✅ | ✅ |

**Key:** Same test code runs everywhere - only the adapter changes!
