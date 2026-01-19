# Main Chat + Mobile Responsiveness Progress

## Branch
`claude/phase1-ui-implementation-wlL7I`

## Status: IN PROGRESS

---

## Overview

Adding two major features:
1. **Main Chat** - Continuous chat at video level for free-form image generation
2. **Mobile Responsiveness** - Full editing capability on mobile devices

---

## Tasks

### Documentation Updates
- [x] Update 04-FRONTEND-video-maker.md with current architecture
- [x] Add MainChat types to documentation
- [x] Add mobile responsiveness section
- [x] Document image sharing model (many-to-many, copy not move)

### Main Chat Feature
- [x] Add MainChat types to types.ts
- [x] Add MainChat operations to mockApi.ts
- [x] Add Main Chat tab/view to video editor
- [x] Add "Copy to Frame" from Main Chat images
- [x] Add image attachment picker for Main Chat
- [ ] Add multiple Main Chats support (create/delete UI)

### Mobile Responsiveness
- [x] Video Editor page responsive layout
- [x] Collapsible sidebar on mobile
- [x] 2-column image grid on mobile
- [x] Touch-friendly action buttons
- [x] Projects page responsive
- [x] Project detail page responsive
- [x] Gallery page responsive
- [x] Modals full-screen on mobile

### Testing
- [ ] Add tests for MainChat operations
- [ ] Test on mobile viewport
- [ ] Verify build passes

---

## Data Model Changes

### New Type: MainChat
```typescript
export interface MainChat {
  id: string;
  name: string;
  videoId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MainChatWithMessages extends MainChat {
  images: Image[];
  messages: MessageWithImages[];
}
```

### Updated Type: Message
```typescript
export interface Message {
  id: string;
  prompt: string;
  withContext: boolean;
  frameId: string | null;      // existing
  contextId: string | null;    // existing
  mainChatId: string | null;   // NEW
  attachedImageIds: string[];
  createdAt: Date;
}
```

### Updated Type: VideoWithDetails
```typescript
export interface VideoWithDetails extends Video {
  context: Context | null;
  frames: FrameWithImages[];
  mainChats: MainChatWithMessages[];  // NEW
}
```

### New Storage Map
```typescript
mainChatImages: Map<string, Set<string>>  // mainChatId -> Set<imageId>
```

---

## UI Design Notes

### Video Editor with Main Chat

```
┌─────────────────────────────────────────────────────────────┐
│ ← Video Name                                    [Gallery]   │
├──────────────────┬──────────────────────────────────────────┤
│ Frames           │  [Frames Tab] [Main Chat Tab]            │
│ ┌──────────────┐ │ ─────────────────────────────────────────│
│ │ + New Frame  │ │                                          │
│ └──────────────┘ │  Main Chat: "Brainstorm 1"               │
│                  │                                          │
│ ┌──────────────┐ │  ┌─────────────────────────────────────┐ │
│ │ 🖼 Frame 1   │ │  │ User: "A sunset over mountains"     │ │
│ └──────────────┘ │  │ [img] [img] [img] [img]             │ │
│                  │  │ [Copy to Frame ▾] [Gallery] [Delete]│ │
│ ┌──────────────┐ │  └─────────────────────────────────────┘ │
│ │    Frame 2   │ │                                          │
│ └──────────────┘ │  ┌─────────────────────────────────────┐ │
│                  │  │ User: "Same but more dramatic"       │ │
│ ─────────────────│  │ [img] [img] [img] [img]             │ │
│ Context          │  └─────────────────────────────────────┘ │
│ ┌──────────────┐ │                                          │
│ │ [collapsed]  │ │ ─────────────────────────────────────────│
│ └──────────────┘ │  [📎] [Enter prompt...        ] [Send]   │
└──────────────────┴──────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────────┐
│ ← Video    [☰] [Gallery]│
├─────────────────────────┤
│ [Frames ▾] [Main Chat]  │
├─────────────────────────┤
│                         │
│  Chat history           │
│  (2 column images)      │
│                         │
│                         │
├─────────────────────────┤
│ [📎] [prompt...] [Send] │
└─────────────────────────┘

Frame selector = dropdown/bottom sheet
```

---

## Progress Log

### 2026-01-19
- Updated 04-FRONTEND-video-maker.md with current state
- Added MainChat types and mobile responsiveness docs
- Created this progress file
- Added MainChat types to types.ts
- Added MainChat operations to mockApi.ts (create, delete, list, generate)
- Added Main Chat tab/view to video editor with tab switching
- Added "Copy to Frame" functionality from Main Chat images
- Added image attachment picker for Main Chat
- Build passes, all tests pass
- Implemented mobile responsiveness:
  - Video Editor: Collapsible sidebar, hamburger menu, responsive layout
  - All modals: Full-screen on mobile
  - Projects page: Responsive cards, mobile-friendly buttons
  - Project detail page: Responsive layout, stacked header on mobile
  - Gallery page: Responsive grid, full-screen image preview
  - Touch-friendly action buttons throughout
- All pages now work on mobile with full editing capability

---

## Last Updated
2026-01-19
