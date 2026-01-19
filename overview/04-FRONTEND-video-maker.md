# Frontend Architecture - Video Frames Editor

## Tech Stack

```
Framework:    Next.js 16 (App Router)
Language:     TypeScript
Styling:      Tailwind CSS
Components:   Custom UI components (shadcn-style)
State:        React useState + mockApi (Phase 1)
              React Query + Zustand (Phase 2+)
Auth:         DISABLED for initial development
```

---

## Project Structure (Current - Phase 1)

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    → redirect to /projects
│   │   ├── globals.css
│   │   ├── projects/
│   │   │   ├── page.tsx                → project list
│   │   │   └── [id]/
│   │   │       ├── page.tsx            → project detail (videos list)
│   │   │       └── gallery/
│   │   │           └── page.tsx        → gallery page
│   │   └── videos/
│   │       └── [id]/
│   │           └── page.tsx            → video editor (all-in-one)
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       └── textarea.tsx
│   ├── lib/
│   │   ├── mockApi.ts                  → in-memory mock API
│   │   ├── types.ts                    → TypeScript types
│   │   └── utils.ts                    → cn() helper
│   └── __tests__/
│       ├── mockApi.test.ts
│       └── components.test.tsx
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── jest.config.ts
```

---

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/projects` | Project List | All projects |
| `/projects/[id]` | Project Detail | Videos list + gallery link |
| `/projects/[id]/gallery` | Gallery | Project gallery images |
| `/videos/[id]` | Video Editor | All-in-one: frames sidebar, chat, context |

---

## Video Editor Page Structure

The main editing happens in `/videos/[id]` which contains:

1. **Left Sidebar** - Frames list
   - Create new frame
   - Select frame to edit
   - Reorder frames
   - See selected image thumbnail per frame
   - Collapsible Context section with chat

2. **Main Area** - Selected Frame Chat
   - Chat history (prompts + generated images)
   - Image actions: select, copy to frame, copy to gallery, delete
   - Generation input fixed at bottom

3. **Main Chat Tab** (NEW)
   - Continuous chat not tied to a specific frame
   - Generate images freely
   - Copy images to any frame
   - Multiple main chats per video

---

## Image Sharing Model (Many-to-Many)

Images can exist in multiple places simultaneously:

- **Copy to Frame** - Image added to frame's collection (original stays)
- **Copy to Gallery** - Image added to project gallery
- **Attach to Prompt** - Use as reference for any chat (Main Chat, Frame Chat, Context)
- **Select for Frame** - Mark as the chosen image for video export

```
Example flow:
1. Generate image in Main Chat
2. Copy to Frame 3 → image now in Main Chat AND Frame 3
3. Attach same image as reference in Frame 5's prompt
4. Select it as Frame 3's chosen image
```

---

## TypeScript Types

```typescript
// lib/types.ts

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  name: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Context {
  id: string;
  content: string;
  videoId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Frame {
  id: string;
  title: string;
  order: number;
  videoId: string;
  selectedImageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MainChat {
  id: string;
  name: string;
  videoId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  prompt: string;
  withContext: boolean;
  frameId: string | null;      // If in frame chat
  contextId: string | null;    // If in context chat
  mainChatId: string | null;   // If in main chat
  attachedImageIds: string[];  // Reference images for generation
  createdAt: Date;
}

export interface Image {
  id: string;
  url: string;
  cloudinaryId: string;
  messageId: string | null;
  createdAt: Date;
}

// Extended types with relations
export interface ProjectWithVideos extends Project {
  videos: Video[];
  galleryImages: Image[];
}

export interface VideoWithDetails extends Video {
  context: Context | null;
  frames: FrameWithImages[];
  mainChats: MainChatWithMessages[];
}

export interface FrameWithImages extends Frame {
  images: Image[];
  selectedImage: Image | null;
  messages: MessageWithImages[];
}

export interface MainChatWithMessages extends MainChat {
  images: Image[];
  messages: MessageWithImages[];
}

export interface MessageWithImages extends Message {
  images: Image[];           // Generated images
  attachedImages: Image[];   // Reference images attached to prompt
}

export interface ContextWithImages extends Context {
  images: Image[];
  messages: MessageWithImages[];
}
```

---

## Mobile Responsiveness

All pages must work on mobile devices with full editing capability:

### Breakpoints
- `sm`: 640px - Mobile
- `md`: 768px - Tablet
- `lg`: 1024px - Desktop

### Mobile Adaptations
1. **Video Editor**
   - Sidebar becomes bottom sheet or collapsible drawer
   - Image grid: 2 columns instead of 4
   - Touch-friendly action buttons
   - Swipe gestures for frame navigation

2. **Project/Video Lists**
   - Full-width cards
   - Larger touch targets

3. **Modals**
   - Full-screen on mobile
   - Bottom sheet style where appropriate

4. **Input Areas**
   - Prompt input fixed at bottom
   - Keyboard-aware layout

---

## Mock API (Phase 1)

Direct function calls, no HTTP:

```typescript
import { mockApi } from "@/lib/mockApi";

// Projects
await mockApi.projects.list();
await mockApi.projects.get(id);
await mockApi.projects.create(name);
await mockApi.projects.delete(id);

// Videos
await mockApi.videos.list(projectId);
await mockApi.videos.get(id);
await mockApi.videos.create(projectId, name);
await mockApi.videos.delete(id);

// Frames
await mockApi.frames.list(videoId);
await mockApi.frames.create(videoId, title);
await mockApi.frames.reorder(frameId, newOrder);
await mockApi.frames.delete(frameId);

// Main Chats
await mockApi.mainChats.list(videoId);
await mockApi.mainChats.create(videoId, name);
await mockApi.mainChats.delete(mainChatId);

// Context
await mockApi.context.get(videoId);
await mockApi.context.update(videoId, content);

// Image Generation
await mockApi.generate.images(frameId, prompt, withContext, attachedImageIds);
await mockApi.generate.contextImages(contextId, prompt, attachedImageIds);
await mockApi.generate.mainChatImages(mainChatId, prompt, attachedImageIds);

// Image Operations
await mockApi.images.select(frameId, imageId);
await mockApi.images.copy(imageId, targetType, targetId);
await mockApi.images.remove(imageId, sourceType, sourceId);
await mockApi.images.delete(imageId);

// Gallery
await mockApi.gallery.list(projectId);
await mockApi.gallery.addImage(projectId, imageId);
await mockApi.gallery.removeImage(projectId, imageId);
```

---

## Phase 2+ Changes

When switching to real API:
1. Replace `mockApi` imports with `api` client
2. Add React Query for caching/mutations
3. Add Zustand for UI state (modals, selections)
4. Add error handling and loading states
5. Add authentication when enabled

---

## Environment Variables

```bash
# .env.local (Phase 1 - not needed, using mockApi)
# NEXT_PUBLIC_API_URL=http://localhost:4000

# Phase 2+
NEXT_PUBLIC_API_URL=http://localhost:4000
```
