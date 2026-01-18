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
│ Context  │  │  Frame   │
└────┬─────┘  └────┬─────┘
     │             │
     │ N:M         │ N:M
     │             │
     └──────┬──────┘
            ▼
       ┌─────────┐
       │  Image  │◄──── N:M with Project (gallery)
       └────┬────┘
            │
            │ N:1 (source)
            ▼
       ┌─────────┐
       │ Message │
       └─────────┘

Selected Image: Frame.selectedImageId → Image (N:1)
```

**Key design:**
- Single `Image` model for all use cases
- Many-to-many: Image can be in multiple Frames, Contexts, and Project galleries
- Image source is always a Message (1:N) - message creates the images
- Copy = add same Image to another relation
- Move = remove from one relation, add to another

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
  galleryImages Image[]  // N:M - images in this project's gallery
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

  video    Video     @relation(fields: [videoId], references: [id], onDelete: Cascade)
  messages Message[] // Chat history (optional)
  images   Image[]   // N:M - reference images
}

model Frame {
  id              String   @id @default(uuid())
  title           String
  order           Int
  videoId         String
  selectedImageId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  video         Video   @relation(fields: [videoId], references: [id], onDelete: Cascade)
  selectedImage Image?  @relation("SelectedImage", fields: [selectedImageId], references: [id], onDelete: SetNull)
  messages      Message[]
  images        Image[] // N:M - images in this frame

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
  images  Image[]  // 1:N - message creates images

  @@index([frameId])
  @@index([contextId])
}

model Image {
  id           String   @id @default(uuid())
  url          String
  cloudinaryId String
  createdAt    DateTime @default(now())

  // Source (1:N - message creates the image)
  messageId String?
  message   Message? @relation(fields: [messageId], references: [id], onDelete: Cascade)

  // Usage (N:M - image can be in multiple places)
  frames   Frame[]   // Can be in multiple frames
  contexts Context[] // Can be in multiple contexts
  projects Project[] // Can be in multiple galleries

  // Selection (N:1 - image can be selected by multiple frames)
  selectedForFrames Frame[] @relation("SelectedImage")

  @@index([messageId])
}
```

---

## Key Relationships

| Relation | Type | Description |
|----------|------|-------------|
| Project → Videos | 1:N | Cascade delete |
| Project ↔ Images | N:M | Gallery images |
| Video → Context | 1:1 | Cascade delete |
| Video → Frames | 1:N | Cascade delete |
| Context ↔ Images | N:M | Reference images |
| Context → Messages | 1:N | Cascade delete |
| Frame ↔ Images | N:M | Images in frame |
| Frame → Messages | 1:N | Cascade delete |
| Message → Images | 1:N | Source of images |
| Image → SelectedForFrames | 1:N | SetNull on delete |

**Note:** User → Projects relationship disabled for initial development.

---

## Image Operations

### Copy (add to another place)
```typescript
// Copy image to another frame (image now in BOTH frames)
await prisma.frame.update({
  where: { id: targetFrameId },
  data: { images: { connect: { id: imageId } } }
});

// Copy image to context
await prisma.context.update({
  where: { id: contextId },
  data: { images: { connect: { id: imageId } } }
});

// Copy image to gallery
await prisma.project.update({
  where: { id: projectId },
  data: { galleryImages: { connect: { id: imageId } } }
});
```

### Move (remove from one, add to another)
```typescript
// Move from Frame A to Frame B
await prisma.$transaction([
  prisma.frame.update({
    where: { id: frameAId },
    data: { images: { disconnect: { id: imageId } } }
  }),
  prisma.frame.update({
    where: { id: frameBId },
    data: { images: { connect: { id: imageId } } }
  })
]);
```

### Delete
```typescript
// Remove from frame (doesn't delete the image)
await prisma.frame.update({
  where: { id: frameId },
  data: { images: { disconnect: { id: imageId } } }
});

// Fully delete image (removes from all relations + Cloudinary)
await prisma.image.delete({ where: { id: imageId } });
await cloudinary.uploader.destroy(image.cloudinaryId);
```

---

## Notes

- **Single Image model** - no separate ContextImage
- **Many-to-many everywhere** - same image can be in multiple frames, contexts, galleries
- **Message is the source** - images are created via messages (1:N)
- **Copy = connect** - add image to another relation
- **Move = disconnect + connect** - remove from one, add to another
- **cloudinaryId** - Cloudinary public_id for deletion
- **selectedImageId** - which image is "chosen" for the frame's final video
- **Cascade deletes** - deleting a video deletes its frames, context, messages
- **SetNull for selection** - deleting an image doesn't delete the frame
- All IDs are UUIDs for security
