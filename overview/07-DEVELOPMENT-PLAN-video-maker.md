# Development Plan - Video Frames Editor

## Overview

Each stage delivers working UI + API, deployed and tested before proceeding.

```
┌────────────────────────────────────────────────────────────────────┐
│                        Development Flow                             │
│                                                                     │
│  Stage 1    Stage 2    Stage 3    Stage 4    Stage 5    Stage 6    │
│  Setup      Projects   Videos     Frames     Images     Auth       │
│  ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐    ┌─────┐   │
│  │ DB  │    │ API │    │ API │    │ API │    │ API │    │ API │   │
│  │     │    │ UI  │    │ UI  │    │ UI  │    │ UI  │    │ UI  │   │
│  └──┬──┘    └──┬──┘    └──┬──┘    └──┬──┘    └──┬──┘    └──┬──┘   │
│     ▼          ▼          ▼          ▼          ▼          ▼       │
│  [DEPLOY]  [DEPLOY]   [DEPLOY]   [DEPLOY]   [DEPLOY]   [DEPLOY]   │
│     ▼          ▼          ▼          ▼          ▼          ▼       │
│  [TEST]    [TEST]     [TEST]     [TEST]     [TEST]     [TEST]     │
│     ✓          ✓          ✓          ✓          ✓          ✓       │
└────────────────────────────────────────────────────────────────────┘
```

**Auth is last** - see results fast, secure later.

---

## Stage 1: Project Setup & Database

**Goal:** Deployable skeleton with database

### Deliverables
- [ ] Monorepo structure
- [ ] Backend (Fastify + Prisma)
- [ ] Frontend (Next.js)
- [ ] Database schema (all models)
- [ ] Health endpoint
- [ ] Railway deployment

### Files
```
video-frames-editor/
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   └── routes/health.ts
│   ├── prisma/schema.prisma
│   ├── tests/
│   │   ├── helpers/db-adapter.ts
│   │   └── database.test.ts
│   └── package.json
├── frontend/
│   ├── src/app/page.tsx
│   └── package.json
└── README.md
```

### API
```
GET /health → { status: "ok", db: "connected" }
```

### Test Gate ✅ Claude Code
```bash
npx vitest run tests/database.test.ts
```

| Test | Pass Criteria |
|------|---------------|
| DB connection | Connects successfully |
| All models | CRUD works for each |
| Cascade deletes | Full chain works |
| Frame ordering | Order maintained |

### Deploy Gate ⚠️ Local
```bash
# Deploy to Railway, then:
curl https://your-app.railway.app/health
# → { "status": "ok", "db": "connected" }
```

**Exit:** Health returns 200, DB connected

---

## Stage 2: Projects (API + UI)

**Goal:** Create and manage projects

### Deliverables
- [ ] Projects API (CRUD)
- [ ] Projects list page
- [ ] Create project modal
- [ ] Delete project

### API
```
GET    /projects         → Project[]
POST   /projects         { name } → Project
GET    /projects/:id     → Project
DELETE /projects/:id     → void
```

### UI Pages
```
/projects          → List all projects, "New Project" button
/projects/[id]     → Project detail (placeholder for videos)
```

### Test Gate ✅ Claude Code
```bash
npx vitest run tests/projects.test.ts
```

| Test | Pass Criteria |
|------|---------------|
| Create project | Returns project with ID |
| List projects | Returns array |
| Get project | Returns single project |
| Delete project | Removes from DB |
| Not found | 404 for invalid ID |

### Deploy Gate ⚠️ Local
```bash
# After deploy:
# 1. Open https://your-app.railway.app
# 2. Create a project
# 3. See it in list
# 4. Delete it
```

**Exit:** Can create/view/delete projects in browser

---

## Stage 3: Videos (API + UI)

**Goal:** Create videos within projects

### Deliverables
- [ ] Videos API (CRUD)
- [ ] Context API (read/update)
- [ ] Videos list in project page
- [ ] Video editor page (empty for now)
- [ ] Context editor panel

### API
```
GET    /projects/:id/videos   → Video[]
POST   /projects/:id/videos   { name } → Video (auto-creates Context)
GET    /videos/:id            → Video
DELETE /videos/:id            → void

GET    /videos/:id/context    → Context
PATCH  /videos/:id/context    { content } → Context
```

### UI Pages
```
/projects/[id]     → Shows videos list, "New Video" button
/videos/[id]       → Video editor with context panel (frames empty)
```

### Test Gate ✅ Claude Code
```bash
npx vitest run tests/videos.test.ts tests/context.test.ts
```

| Test | Pass Criteria |
|------|---------------|
| Create video | Auto-creates empty context |
| List videos | Scoped to project |
| Get/update context | Persists content |
| Delete video | Cascades to context |

### Deploy Gate ⚠️ Local
```bash
# After deploy:
# 1. Create project
# 2. Create video inside project
# 3. Open video editor
# 4. Edit context, refresh, see it persisted
```

**Exit:** Videos and context working in browser

---

## Stage 4: Frames (API + UI)

**Goal:** Create and reorder frames

### Deliverables
- [ ] Frames API (CRUD + reorder)
- [ ] Frame list panel (left side)
- [ ] Frame detail panel (right side)
- [ ] Drag-and-drop reordering
- [ ] Frame title editing

### API
```
GET    /videos/:id/frames     → Frame[] (ordered)
POST   /videos/:id/frames     { title } → Frame (auto-order)
GET    /frames/:id            → Frame
PATCH  /frames/:id            { title?, order? } → Frame
DELETE /frames/:id            → void
```

### UI Layout
```
┌─────────────────────────────────────────────────┐
│ Video: My Video                    [Context]    │
├──────────────┬──────────────────────────────────┤
│ Frames       │  Frame Detail                    │
│ ┌──────────┐ │  ┌────────────────────────────┐  │
│ │ Scene 1  │ │  │ Title: Scene 1             │  │
│ ├──────────┤ │  │                            │  │
│ │ Scene 2  │ │  │ (images will go here)      │  │
│ ├──────────┤ │  │                            │  │
│ │ Scene 3  │ │  │                            │  │
│ └──────────┘ │  └────────────────────────────┘  │
│ [+ Add Frame]│                                  │
└──────────────┴──────────────────────────────────┘
```

### Test Gate ✅ Claude Code
```bash
npx vitest run tests/frames.test.ts
```

| Test | Pass Criteria |
|------|---------------|
| Create frame | Gets next order number |
| List frames | Returns in order |
| Reorder frame | Shifts others correctly |
| Delete frame | Removes, others stay ordered |
| Update title | Persists change |

### Deploy Gate ⚠️ Local
```bash
# After deploy:
# 1. Open video
# 2. Add 3 frames
# 3. Drag to reorder
# 4. Refresh, order persists
# 5. Delete middle frame, order still correct
```

**Exit:** Frame CRUD and reordering works in browser

---

## Stage 5: Image Generation (API + UI)

**Goal:** Generate images via chat, select for frames

### Deliverables
- [ ] Image provider abstraction
- [ ] GPT-Image-1 provider
- [ ] Cloudinary upload service
- [ ] Messages API
- [ ] Chat UI in frame panel
- [ ] Image grid with selection
- [ ] Gallery page

### API
```
GET    /frames/:id/messages   → Message[] (with images)
POST   /frames/:id/messages   { prompt, withContext } → Message + Image[]
POST   /frames/:id/select     { imageId } → Frame

GET    /projects/:id/gallery  → GalleryImage[]
POST   /projects/:id/gallery  { imageId } → GalleryImage
DELETE /gallery/:id           → void
```

### UI Components
```
Frame Detail Panel:
┌────────────────────────────────────────┐
│ Scene 1                                │
├────────────────────────────────────────┤
│ Selected: [image thumbnail]            │
├────────────────────────────────────────┤
│ Chat:                                  │
│ ┌────────────────────────────────────┐ │
│ │ You: A cat on a beach              │ │
│ │ ┌─────┬─────┬─────┬─────┐         │ │
│ │ │ img │ img │ img │ img │         │ │
│ │ └─────┴─────┴─────┴─────┘         │ │
│ │ You: Make it sunset               │ │
│ │ ┌─────┬─────┬─────┬─────┐         │ │
│ │ │ img │ img │ img │ img │         │ │
│ │ └─────┴─────┴─────┴─────┘         │ │
│ └────────────────────────────────────┘ │
│ [____prompt____] [x] Use Context [Send]│
└────────────────────────────────────────┘
```

### Test Gate ✅ Claude Code (mocked)
```bash
npx vitest run tests/image-generation.test.ts tests/messages.test.ts
```

| Test | Pass Criteria |
|------|---------------|
| Mock provider | Returns 4 URLs |
| Create message | Saves with images |
| List messages | Returns with images |
| Select image | Updates frame.selectedImageId |
| Context merge | Combines context + prompt |
| Gallery add | Saves image reference |

### Test Gate ⚠️ Local (real API)
```bash
OPENAI_API_KEY=sk-... CLOUDINARY_URL=... npx vitest run tests/image-generation.real.test.ts
```

| Test | Pass Criteria |
|------|---------------|
| Real generation | Returns valid URLs |
| Cloudinary upload | Returns CDN URL |

### Deploy Gate ⚠️ Local
```bash
# After deploy:
# 1. Open frame
# 2. Type prompt, send
# 3. See 4 images appear
# 4. Click one to select
# 5. See it as selected image
# 6. Add to gallery
# 7. Check gallery page
```

**Exit:** Full image generation flow works in browser

---

## Stage 6: Authentication (API + UI)

**Goal:** Secure the app with user accounts

### Deliverables
- [ ] Auth API (signup, login, me)
- [ ] JWT middleware
- [ ] Protect all routes
- [ ] Login/signup pages
- [ ] Auth state in frontend
- [ ] Logout

### API
```
POST /auth/signup    { email, password } → { token, user }
POST /auth/login     { email, password } → { token, user }
GET  /auth/me        [Auth] → User

# All other routes now require: Authorization: Bearer <token>
```

### UI Pages
```
/login     → Login form
/signup    → Signup form
/          → Redirect to /login or /projects
```

### Test Gate ✅ Claude Code
```bash
npx vitest run tests/auth.test.ts
```

| Test | Pass Criteria |
|------|---------------|
| Signup | Creates user, returns token |
| Login | Returns token for valid creds |
| Invalid login | Rejects wrong password |
| JWT valid | /me returns user |
| JWT invalid | 401 on bad token |
| Protected routes | 401 without token |
| User isolation | Can't see other's projects |

### Deploy Gate ⚠️ Local
```bash
# After deploy:
# 1. Try /projects without login → redirects to /login
# 2. Sign up
# 3. Create project
# 4. Logout
# 5. Login as different user
# 6. Don't see first user's project
```

**Exit:** Full auth working, users isolated

---

## Future: Video Export

**Marked for future development**

- Export frames as video via Cloudinary
- Export progress tracking
- Video gallery

---

## Summary

| Stage | Deliverable | API | UI | Tests (CC) | Deploy Check |
|-------|-------------|-----|-----|------------|--------------|
| 1 | Setup | Health | Landing | DB tests | Health 200 |
| 2 | Projects | CRUD | List/Create | 5+ | CRUD in browser |
| 3 | Videos | CRUD + Context | List/Editor | 5+ | Context persists |
| 4 | Frames | CRUD + Reorder | List/Drag | 5+ | Reorder works |
| 5 | Images | Generate/Select | Chat/Grid | 6+ | Full flow |
| 6 | Auth | JWT | Login/Signup | 7+ | User isolation |

**Total: ~35+ tests**, most in Claude Code VM

### Workflow

```
For each stage:
1. Claude builds API + UI
2. Claude runs tests (npx vitest run)
3. If green → you deploy to Railway
4. You verify in browser
5. Move to next stage
```

---

## Quick Commands

```bash
# Claude Code (all stages)
npx vitest run

# Stage-specific
npx vitest run tests/database.test.ts      # Stage 1
npx vitest run tests/projects.test.ts      # Stage 2
npx vitest run tests/videos.test.ts        # Stage 3
npx vitest run tests/frames.test.ts        # Stage 4
npx vitest run tests/messages.test.ts      # Stage 5
npx vitest run tests/auth.test.ts          # Stage 6

# Local with real APIs (Stage 5)
OPENAI_API_KEY=sk-... CLOUDINARY_URL=... npx vitest run tests/image-generation.real.test.ts
```
