# Claude Code Instructions - Video Frames Editor

## Overview

This document provides step-by-step instructions for Claude Code to build the Video Frames Editor application.

---

## Prerequisites

Before starting, ensure you have:

1. Node.js 20+ installed
2. PostgreSQL running (local or Docker)
3. API keys ready:
   - OpenAI API key
   - Cloudinary credentials
   - (Optional) Anthropic API key for testing

---

## Project Structure

```
video-frames-editor/
├── backend/
│   ├── src/
│   ├── prisma/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── stores/
│   ├── types/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Phase 1: Backend Setup

### Step 1.1: Initialize Backend

```bash
mkdir -p video-frames-editor/backend
cd video-frames-editor/backend
npm init -y
```

### Step 1.2: Install Dependencies

```bash
npm install fastify @fastify/cors @fastify/jwt @prisma/client bcrypt cloudinary openai zod fastify-plugin
npm install -D typescript tsx @types/node @types/bcrypt prisma vitest
```

### Step 1.3: Create tsconfig.json

Create `tsconfig.json` with ES2022 target, NodeNext module resolution.

### Step 1.4: Create Prisma Schema

Create `prisma/schema.prisma` with models:
- User (id, email, password, timestamps)
- Project (id, name, userId, timestamps)
- GalleryImage (id, url, cloudinaryId, projectId, timestamp)
- Video (id, name, projectId, timestamps)
- Context (id, videoId, timestamps)
- Frame (id, title, order, videoId, selectedImageId, timestamps)
- Message (id, prompt, withContext, frameId, contextId, timestamp)
- Image (id, url, cloudinaryId, messageId, timestamp)

### Step 1.5: Setup Environment

Create `.env` file:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/video_frames_editor
JWT_SECRET=your-secret-here
OPENAI_API_KEY=sk-...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PORT=4000
FRONTEND_URL=http://localhost:3000
```

### Step 1.6: Run Initial Migration

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Step 1.7: Create Source Files

Create the following structure:
```
src/
├── index.ts           # Fastify server entry
├── config/
│   └── env.ts         # Environment validation
├── plugins/
│   ├── prisma.ts      # Prisma client plugin
│   └── auth.ts        # JWT auth plugin
├── routes/
│   ├── auth.ts        # Login/signup
│   ├── projects.ts    # Project CRUD
│   ├── videos.ts      # Video CRUD
│   ├── frames.ts      # Frame CRUD + reorder
│   ├── context.ts     # Context routes
│   └── images.ts      # Image management
├── services/
│   ├── openai.service.ts      # DALL-E integration
│   └── cloudinary.service.ts  # Image storage
└── utils/
    └── errors.ts      # Error classes
```

### Step 1.8: Implement Core Services

1. **openai.service.ts**: Function `generateImages(prompt, count)` that calls DALL-E 3
2. **cloudinary.service.ts**: Functions for `uploadImage`, `deleteImage`, `createSlideshow`

### Step 1.9: Implement Routes

Order of implementation:
1. Auth routes (signup, login, me)
2. Projects CRUD
3. Videos CRUD (auto-create Context on new video)
4. Frames CRUD + reorder
5. Context routes
6. Image generation endpoint
7. Image management (move, delete)
8. Export endpoint

### Step 1.10: Test Backend

```bash
npm run dev
# Test with curl or Postman
curl http://localhost:4000/health
```

---

## Phase 2: Frontend Setup

### Step 2.1: Initialize Frontend

```bash
cd ../
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir
cd frontend
```

### Step 2.2: Install Additional Dependencies

```bash
npm install @tanstack/react-query zustand react-hook-form @hookform/resolvers zod lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-checkbox @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge tailwindcss-animate
```

### Step 2.3: Setup shadcn/ui

```bash
npx shadcn@latest init
npx shadcn@latest add button input label checkbox dialog alert-dialog dropdown-menu
```

### Step 2.4: Create Environment

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Step 2.5: Create Source Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx
│       └── projects/...
├── components/
│   ├── ui/           # shadcn components
│   ├── layout/
│   ├── projects/
│   ├── videos/
│   ├── frames/
│   ├── chat/
│   └── images/
├── hooks/
├── lib/
│   └── api.ts
├── stores/
│   └── uiStore.ts
└── types/
    └── index.ts
```

### Step 2.6: Implement API Client

Create `lib/api.ts` with all API methods for auth, projects, videos, frames, messages, images.

### Step 2.7: Implement Hooks

Create React Query hooks:
- `useAuth.ts`
- `useProjects.ts`
- `useVideos.ts`
- `useFrames.ts`
- `useMessages.ts`
- `useImages.ts`

### Step 2.8: Implement Pages

Order of implementation:
1. Login/Signup pages
2. Projects list page
3. Project detail page (videos list)
4. Video editor page (context + frames)
5. Context chat page
6. Frame chat page
7. All Images page
8. Gallery page

### Step 2.9: Implement Components

Key components:
1. `PromptInput` - text input with context checkbox
2. `MessageList` - display chat history
3. `ImageThumbnail` - image with actions
4. `MoveImageModal` - select destination
5. `FrameCard` - frame with reorder buttons

### Step 2.10: Test Frontend

```bash
npm run dev
# Open http://localhost:3000
```

---

## Phase 3: Integration Testing

### Step 3.1: Create Test Structure

```
backend/tests/
├── unit/
│   ├── auth.test.ts
│   └── frames.test.ts
├── integration/
│   ├── openai.test.ts
│   └── cloudinary.test.ts
└── evaluation/
    └── image-quality.test.ts
```

### Step 3.2: Implement Image Evaluation

Create `services/evaluation.service.ts` using Anthropic Claude API to verify generated images match prompts.

### Step 3.3: Run Tests

```bash
# Unit tests
npm test -- tests/unit

# Integration tests (requires API keys)
npm test -- tests/integration

# Evaluation tests (requires Claude API)
npm test -- tests/evaluation
```

---

## Phase 4: Deployment

### Step 4.1: Create Dockerfiles

Create `backend/Dockerfile` and `frontend/Dockerfile` for production builds.

### Step 4.2: Create Railway Configuration

Create `railway.toml` files for both services.

### Step 4.3: Deploy to Railway

1. Create Railway project
2. Add PostgreSQL database
3. Deploy backend service
4. Deploy frontend service
5. Set environment variables
6. Configure custom domains (optional)

---

## Implementation Notes

### Authentication Flow

1. User signs up with email/password
2. Password hashed with bcrypt
3. JWT token returned
4. Frontend stores token in localStorage
5. Token sent in Authorization header

### Image Generation Flow

1. User enters prompt
2. Optional: combine with context text
3. Call OpenAI DALL-E 3 (4 images)
4. Upload each to Cloudinary
5. Save URLs to database
6. Return message with images

### Video Export Flow

1. Get all frames with selected images (ordered)
2. Extract Cloudinary public IDs
3. Call Cloudinary slideshow API
4. Return video URL

### Frame Reordering

1. User clicks up/down button
2. Calculate new order
3. Update all affected frames in transaction
4. Return updated frame list

---

## Common Issues

### CORS Errors

Ensure `FRONTEND_URL` is set correctly in backend and included in CORS origin list.

### Database Connection

Check `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname`

### Image Generation Fails

- Check OpenAI API key
- Check rate limits
- Check content policy violations

### Cloudinary Upload Fails

- Verify credentials
- Check file size limits
- Ensure URL is accessible

---

## Quality Checklist

Before considering complete:

- [ ] User can sign up and login
- [ ] User can create/delete projects
- [ ] User can create/delete videos
- [ ] User can create/delete/reorder frames
- [ ] User can generate images with prompts
- [ ] User can generate images with context
- [ ] User can select cover image for frame
- [ ] User can move images between frames
- [ ] User can move images to other projects
- [ ] User can clear chat history
- [ ] User can export video
- [ ] All tests pass
- [ ] Deployed and accessible
