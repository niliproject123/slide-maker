# Backend Progress - Phase 2.0

## Status: COMPLETE

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
- [x] Many-to-many relation maps (frameImages, contextImages, mainChatImages, galleryImages)
- [x] Helper functions for creating entities (projects, videos, frames, mainChats)
- [x] Helper functions for counting related entities
- [x] Auto-initialization with sample data
- [x] Auto-create default MainChat when creating a video

### 3. Types (`src/types/index.ts`)
- [x] Base entity types: Project, Video, Context, Frame, MainChat, Message, Image
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
- [x] `POST /projects/:projectId/videos` - Create video (auto-creates context + mainChat)
- [x] `GET /videos/:id` - Get video with context, frames, and mainChats
- [x] `PUT /videos/:id` - Update video name
- [x] `DELETE /videos/:id` - Delete video and cascade (including mainChats)

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

#### Main Chats (`src/routes/mainChats.ts`)
- [x] `GET /videos/:videoId/main-chats` - List main chats in video
- [x] `POST /videos/:videoId/main-chats` - Create main chat
- [x] `GET /main-chats/:id` - Get main chat with messages
- [x] `PUT /main-chats/:id` - Update main chat name
- [x] `DELETE /main-chats/:id` - Delete main chat
- [x] `DELETE /main-chats/:id/history` - Clear message history

#### Generation (`src/routes/generate.ts`)
- [x] `POST /frames/:frameId/generate` - Generate images for frame (mock)
- [x] `POST /videos/:videoId/context/generate` - Generate images for context (mock)
- [x] `POST /main-chats/:mainChatId/generate` - Generate images for main chat (mock)
- [x] `POST /frames/:frameId/upload` - Upload image to frame (mock)
- [x] `POST /main-chats/:mainChatId/upload` - Upload image to main chat (mock)

#### Images (`src/routes/images.ts`)
- [x] `GET /projects/:projectId/images` - Get all images grouped by video/frame
- [x] `DELETE /images/:id` - Delete image completely
- [x] `POST /images/:id/copy` - Copy image to another location (frame/context/gallery/mainChat)
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
- [x] All routes registered (including mainChatRoutes)
- [x] Production/development logger configuration

### 6. Frontend Integration
- [x] Created `frontend/src/lib/api.ts` - HTTP client with same interface as mockApi
- [x] Updated `frontend/src/lib/mockApi.ts` - Re-exports from api.ts for backwards compatibility
- [x] Set up `NEXT_PUBLIC_API_URL` environment variable support

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

### Backend
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

### Frontend
```bash
cd frontend

# Set API URL (optional, defaults to http://localhost:4000)
export NEXT_PUBLIC_API_URL=http://localhost:4000

# Development
npm run dev

# Build
npm run build
```

---

## Notes

- All "generate" endpoints return placeholder images from picsum.photos
- All "upload" endpoints create mock images (no actual file handling yet)
- Data persists only in memory (resets on server restart)
- CORS is enabled for all origins (development mode)
- Frontend automatically uses HTTP API when `NEXT_PUBLIC_API_URL` is set
