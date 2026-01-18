# Database Schema - Video Frames Editor

## Overview

**Database:** PostgreSQL (hosted on Railway)

**ORM:** Prisma

---

## Entity Relationship Diagram

```
┌──────────┐
│   User   │
└────┬─────┘
     │ 1:N
     ▼
┌──────────┐
│ Project  │◄────────────────────────┐
└────┬─────┘                         │
     │ 1:N                           │
     ▼                               │
┌──────────┐                    ┌────┴─────┐
│  Video   │                    │ Gallery  │
└────┬─────┘                    │  Image   │
     │                          └──────────┘
     ├─────────────┐
     │ 1:1         │ 1:N
     ▼             ▼
┌──────────┐  ┌──────────┐
│ Context  │  │  Frame   │◄─────────┐
└────┬─────┘  └────┬─────┘          │
     │             │                │ selectedImage
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
```

**Image sources:**
- Generated via Message (has messageId)
- Uploaded directly to Frame (has frameId, no messageId)
- Context images (separate ContextImage model)

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

model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String    // bcrypt hashed
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  projects  Project[]
}

model Project {
  id        String   @id @default(uuid())
  name      String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  videos        Video[]
  galleryImages GalleryImage[]
  
  @@index([userId])
}

model GalleryImage {
  id           String   @id @default(uuid())
  url          String
  cloudinaryId String
  projectId    String
  createdAt    DateTime @default(now())
  
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
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
  selectedImageId String?  @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  video         Video     @relation(fields: [videoId], references: [id], onDelete: Cascade)
  selectedImage Image?    @relation("SelectedImage", fields: [selectedImageId], references: [id], onDelete: SetNull)
  messages      Message[] // Generated images come via messages
  images        Image[]   @relation("FrameImages") // Uploaded images directly on frame
  
  @@index([videoId])
  @@index([videoId, order])
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
  id           String   @id @default(uuid())
  url          String
  cloudinaryId String
  messageId    String?  // Set if generated via message
  frameId      String?  // Set if uploaded directly to frame
  createdAt    DateTime @default(now())
  
  message     Message? @relation("MessageImages", fields: [messageId], references: [id], onDelete: Cascade)
  frame       Frame?   @relation("FrameImages", fields: [frameId], references: [id], onDelete: Cascade)
  selectedFor Frame?   @relation("SelectedImage")
  
  @@index([messageId])
  @@index([frameId])
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
| User → Projects | 1:N | Cascade |
| Project → Videos | 1:N | Cascade |
| Project → GalleryImages | 1:N | Cascade |
| Video → Context | 1:1 | Cascade |
| Video → Frames | 1:N | Cascade |
| Context → ContextImages | 1:N | Cascade |
| Context → Messages | 1:N | Cascade |
| Frame → Messages | 1:N | Cascade |
| Frame → Images (uploaded) | 1:N | Cascade |
| Message → Images (generated) | 1:N | Cascade |
| Frame → SelectedImage | 1:1 | SetNull |

---

## Image Types

| Type | Stored In | Source |
|------|-----------|--------|
| Generated (frame) | Image (messageId set) | GPT Image API via Message |
| Uploaded (frame) | Image (frameId set) | User upload |
| Context reference | ContextImage | User upload |
| Gallery | GalleryImage | Saved from frames |

---

## Notes

- **Image** can belong to Message (generated) OR Frame directly (uploaded), but not both
- **ContextImage** is separate - these are reference images for generation, not frame images
- **Context.content** holds the text context
- **Frame.selectedImageId** uses `SetNull` so deleting an image doesn't delete the frame
- All IDs are UUIDs for security
- Indexes added for common query patterns
