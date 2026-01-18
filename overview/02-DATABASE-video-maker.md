# Database Schema - Video Frames Editor

## Overview

**Database:** PostgreSQL (hosted on Railway)

**ORM:** Prisma

**Note:** Authentication is disabled for initial development. User/auth will be added later.

---

## Entity Relationship Diagram

```
┌──────────┐
│ Project  │
└────┬─────┘
     │ 1:N
     ▼
┌──────────┐
│  Video   │
└────┬─────┘
     │
     ├─────────────┐
     │ 1:1         │ 1:N
     ▼             ▼
┌──────────┐  ┌──────────┐
│ Context  │  │  Frame   │◄─────────┐
└────┬─────┘  └────┬─────┘          │
     │             │                │ selectedImage (N:1)
     ├─────┐       ├─────┐          │
     │     │       │     │          │
     │ 1:N │ 1:N   │ 1:N │ 1:N      │
     ▼     ▼       ▼     ▼          │
┌───────┐ ┌───────┐ ┌───────┐ ┌─────┴─┐
│Context│ │Message│ │Message│ │ Image │
│ Image │ └───┬───┘ └───┬───┘ │(upload)
└───────┘     │         │     └───────┘
              │ 1:N     │ 1:N
              ▼         ▼
          ┌───────┐ ┌───────┐
          │ Image │ │ Image │
          └───────┘ └───────┘

┌──────────┐
│  Image   │──── can also have galleryProjectId (for images moved from other projects)
└──────────┘
```

**Image sources:**
- Generated via Message (has messageId)
- Uploaded directly to Frame (has frameId, no messageId)
- In Gallery (has galleryProjectId - moved from another project)
- Context images (separate ContextImage model)

**Note:** Same image can be selected by multiple Frames (N:1 relationship).

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Note: User model disabled for initial development
// model User {
//   id        String    @id @default(uuid())
//   email     String    @unique
//   password  String    // bcrypt hashed
//   createdAt DateTime  @default(now())
//   updatedAt DateTime  @updatedAt
//   projects  Project[]
// }

model Project {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  videos        Video[]
  galleryImages Image[] @relation("GalleryImages")  // Images moved from other projects
}

model Video {
  id        String   @id @default(uuid())
  name      String
  projectId String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  project Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  context Context?
  frames  Frame[]
  
  @@index([projectId])
}

model Context {
  id        String   @id @default(uuid())
  content   String   @default("")  // Text context
  videoId   String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  video    Video          @relation(fields: [videoId], references: [id], onDelete: Cascade)
  messages Message[]      // Chat history (optional)
  images   ContextImage[] // Reference images
}

model ContextImage {
  id           String   @id @default(uuid())
  url          String
  cloudinaryId String
  contextId    String
  createdAt    DateTime @default(now())
  
  context Context @relation(fields: [contextId], references: [id], onDelete: Cascade)
  
  @@index([contextId])
}

model Frame {
  id              String   @id @default(uuid())
  title           String
  order           Int
  videoId         String
  selectedImageId String?  // No @unique - same image can be selected by multiple frames
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  video         Video     @relation(fields: [videoId], references: [id], onDelete: Cascade)
  selectedImage Image?    @relation("SelectedImage", fields: [selectedImageId], references: [id], onDelete: SetNull)
  messages      Message[] // Generated images come via messages
  images        Image[]   @relation("FrameImages") // Uploaded images directly on frame

  @@index([videoId])
  @@index([videoId, order])
  @@index([selectedImageId])
}

model Message {
  id          String   @id @default(uuid())
  prompt      String
  withContext Boolean  @default(false)
  frameId     String?
  contextId   String?
  createdAt   DateTime @default(now())
  
  frame   Frame?   @relation(fields: [frameId], references: [id], onDelete: Cascade)
  context Context? @relation(fields: [contextId], references: [id], onDelete: Cascade)
  images  Image[]  @relation("MessageImages")
  
  @@index([frameId])
  @@index([contextId])
}

model Image {
  id               String   @id @default(uuid())
  url              String
  cloudinaryId     String
  messageId        String?  // Set if generated via message
  frameId          String?  // Set if uploaded directly to frame
  galleryProjectId String?  // Set if moved to another project's gallery
  createdAt        DateTime @default(now())

  message        Message? @relation("MessageImages", fields: [messageId], references: [id], onDelete: Cascade)
  frame          Frame?   @relation("FrameImages", fields: [frameId], references: [id], onDelete: Cascade)
  galleryProject Project? @relation("GalleryImages", fields: [galleryProjectId], references: [id], onDelete: Cascade)
  selectedFor    Frame[]  @relation("SelectedImage")  // Can be selected by multiple frames

  @@index([messageId])
  @@index([frameId])
  @@index([galleryProjectId])
}
```

---

## Migration Commands

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name init

# Apply migrations (production)
npx prisma migrate deploy

# View database in browser
npx prisma studio
```

---

## Key Relationships

| Relation | Type | On Delete |
|----------|------|-----------|
| Project → Videos | 1:N | Cascade |
| Project → GalleryImages | 1:N | Cascade |
| Video → Context | 1:1 | Cascade |
| Video → Frames | 1:N | Cascade |
| Context → ContextImages | 1:N | Cascade |
| Context → Messages | 1:N | Cascade |
| Frame → Messages | 1:N | Cascade |
| Frame → Images (uploaded) | 1:N | Cascade |
| Message → Images (generated) | 1:N | Cascade |
| Image → SelectedFor (Frames) | 1:N | SetNull |

**Note:** User → Projects relationship disabled for initial development.

---

## Image Types

| Type | Stored In | Source |
|------|-----------|--------|
| Generated (frame) | Image (messageId set) | GPT Image API via Message |
| Uploaded (frame) | Image (frameId set) | User upload |
| Context reference | ContextImage | User upload |
| Gallery | Image (galleryProjectId set) | Moved from another project |

---

## Notes

- **Image** can belong to Message (generated) OR Frame directly (uploaded), but not both
- **Image** can also be in a project's Gallery (galleryProjectId set) when moved from another project
- **Same Image can be selected by multiple Frames** - no uniqueness constraint
- **ContextImage** is separate - these are reference images for generation, not frame images
- **Context.content** holds the text context
- **Frame.selectedImageId** uses `SetNull` so deleting an image doesn't delete the frame
- All IDs are UUIDs for security
- Indexes added for common query patterns
- **Authentication disabled** for initial development - will be added later
- **Video export disabled** for initial development - will be added later
