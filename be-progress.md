# Backend Progress - Phase 2.0

## Status: IN PROGRESS

### Phase 2.0 - All Mocked API

This phase creates a Fastify API server that mirrors the frontend's `mockApi.ts` functionality. All data is stored in-memory (no real database), and all external services (OpenAI, Cloudinary) are mocked.

---

## Completed

### 1. Project Setup
- [x] Created `/backend` folder structure
- [x] Initialized npm project with TypeScript
- [x] Installed dependencies: fastify, @fastify/cors, @fastify/multipart, uuid, tsx, typescript
- [x] Created `tsconfig.json` for ES modules
- [x] Created `package.json` with dev/build scripts

### 2. Mock Storage Service (`src/services/mockStorage.ts`)
- [x] In-memory storage maps for all entities
- [x] Many-to-many relation maps (frameImages, contextImages, galleryImages)
- [x] Helper functions for creating entities
- [x] Helper functions for counting related entities
- [x] Auto-initialization with sample data

### 3. Types (`src/types/index.ts`)
- [x] Base entity types: Project, Video, Context, Frame, Message, Image
- [x] Extended types with relations
- [x] API response types

### 4. Routes

#### Projects (`src/routes/projects.ts`)
- [x] `GET /projects` - List all projects with counts
- [x] `POST /projects` - Create new project
- [x] `GET /projects/:id` - Get project with videos
- [x] `PUT /projects/:id` - Update project name
- [x] `DELETE /projects/:id` - Delete project and cascade

#### Videos (`src/routes/videos.ts`)
- [x] `GET /projects/:projectId/videos` - List videos in project
- [x] `POST /projects/:projectId/videos` - Create video (auto-creates context)
- [x] `GET /videos/:id` - Get video with context and frames
- [x] `PUT /videos/:id` - Update video name
- [x] `DELETE /videos/:id` - Delete video and cascade

#### Frames (`src/routes/frames.ts`)
- [x] `GET /videos/:videoId/frames` - List frames in video
- [x] `POST /videos/:videoId/frames` - Create frame
- [x] `PUT /frames/:id` - Update frame title
- [x] `PATCH /frames/:id/reorder` - Change frame order
- [x] `PATCH /frames/:id/selected-image` - Set selected image
- [x] `DELETE /frames/:id` - Delete frame
- [x] `DELETE /frames/:id/history` - Clear message history
- [x] `GET /frames/:id/messages` - Get frame messages
- [x] `GET /frames/:id/images` - Get frame images

#### Context (`src/routes/context.ts`)
- [x] `GET /videos/:videoId/context` - Get context with images and messages
- [x] `PATCH /videos/:videoId/context` - Update context text
- [x] `POST /videos/:videoId/context/images` - Upload image (mock)
- [x] `DELETE /videos/:videoId/context/history` - Clear message history
- [x] `GET /videos/:videoId/context/messages` - Get context messages

#### Generation (`src/routes/generate.ts`)
- [x] `POST /frames/:frameId/generate` - Generate images for frame (mock - returns picsum images)
- [x] `POST /videos/:videoId/context/generate` - Generate images for context (mock)
- [x] `POST /frames/:frameId/upload` - Upload image to frame (mock)

#### Images (`src/routes/images.ts`)
- [x] `GET /projects/:projectId/images` - Get all images grouped by video/frame
- [x] `DELETE /images/:id` - Delete image completely
- [x] `POST /images/:id/copy` - Copy image to another location
- [x] `POST /images/:id/move` - Move image between locations
- [x] `POST /images/:id/remove` - Remove image from specific relation

#### Gallery (`src/routes/gallery.ts`)
- [x] `GET /projects/:projectId/gallery` - Get gallery images
- [x] `POST /projects/:projectId/gallery` - Add image to gallery
- [x] `DELETE /projects/:projectId/gallery/:imageId` - Remove from gallery
- [x] `POST /projects/:projectId/gallery/upload` - Upload to gallery (mock)

### 5. Server Entry (`src/index.ts`)
- [x] Fastify server with CORS enabled
- [x] Health check endpoint
- [x] All routes registered
- [x] Console startup message with endpoints list

---

## To Do (Phase 2.0)

### Frontend Integration
- [ ] Create API client in frontend that switches between mockApi and HTTP calls
- [ ] Update frontend to use the new API client
- [ ] Test all endpoints with frontend

---

## Future Phases

### Phase 2.1 - Real OpenAI
- [ ] Add OpenAI SDK
- [ ] Implement actual image generation with gpt-image-1
- [ ] Environment variable for API key

### Phase 2.2 - Real Cloudinary
- [ ] Add Cloudinary SDK
- [ ] Implement actual image upload
- [ ] Replace mock URLs with Cloudinary URLs

### Phase 2.3 - Real PostgreSQL
- [ ] Add Prisma ORM
- [ ] Create database schema
- [ ] Replace in-memory storage with database queries

---

## How to Run

```bash
cd backend

# Development (with hot reload)
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build
npm start
```

Server runs at `http://localhost:4000`

---

## Notes

- All "generate" endpoints return placeholder images from picsum.photos
- All "upload" endpoints create mock images (no actual file handling yet)
- Data persists only in memory (resets on server restart)
- CORS is enabled for all origins (development mode)
