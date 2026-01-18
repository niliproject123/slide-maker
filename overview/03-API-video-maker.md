# API Endpoints - Video Frames Editor

## Overview

**Framework:** Fastify (TypeScript)

**Base URL:** `https://api.your-domain.com` or `http://localhost:4000`

**Auth:** Disabled for initial development (will be added later)

---

## Authentication (DISABLED)

> **Note:** Authentication is disabled for initial development. All endpoints are publicly accessible. User authentication will be added in a later phase.

<!--
### POST /auth/signup
### POST /auth/login
### GET /auth/me
These endpoints will be implemented when auth is enabled.
-->

---

## Projects

No authentication required (auth disabled).

### GET /projects

Get all projects.

```
Response 200:
[
  {
    "id": "uuid",
    "name": "Summer Campaign",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-16T12:00:00Z",
    "videoCount": 3,
    "imageCount": 44,
    "galleryCount": 2
  }
]
```

### POST /projects

Create new project.

```
Request:
{
  "name": "New Project"
}

Response 201:
{
  "id": "uuid",
  "name": "New Project",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "videoCount": 0,
  "imageCount": 0,
  "galleryCount": 0
}
```

### GET /projects/:id

Get single project with videos.

```
Response 200:
{
  "id": "uuid",
  "name": "Summer Campaign",
  "createdAt": "2024-01-15T10:00:00Z",
  "videos": [
    {
      "id": "uuid",
      "name": "Episode 1",
      "frameCount": 4,
      "imageCount": 12
    }
  ],
  "galleryCount": 2
}

Errors:
404 - Project not found
```

### PUT /projects/:id

Update project name.

```
Request:
{
  "name": "Updated Name"
}

Response 200:
{
  "id": "uuid",
  "name": "Updated Name",
  ...
}
```

### DELETE /projects/:id

Delete project and all contents.

```
Response 200:
{
  "success": true,
  "deleted": {
    "videos": 3,
    "frames": 12,
    "images": 44
  }
}
```

---

## Videos

### GET /projects/:projectId/videos

Get all videos in project.

```
Response 200:
[
  {
    "id": "uuid",
    "name": "Episode 1",
    "createdAt": "2024-01-15T10:00:00Z",
    "frameCount": 4,
    "imageCount": 12
  }
]
```

### POST /projects/:projectId/videos

Create new video (auto-creates empty Context).

```
Request:
{
  "name": "New Video"
}

Response 201:
{
  "id": "uuid",
  "name": "New Video",
  "createdAt": "2024-01-15T10:00:00Z",
  "context": {
    "id": "uuid",
    "messageCount": 0
  },
  "frames": []
}
```

### GET /videos/:id

Get video with context and frames.

```
Response 200:
{
  "id": "uuid",
  "name": "Episode 1",
  "projectId": "uuid",
  "context": {
    "id": "uuid",
    "messageCount": 2,
    "imageCount": 6
  },
  "frames": [
    {
      "id": "uuid",
      "title": "Hero wakes up",
      "order": 0,
      "selectedImage": {
        "id": "uuid",
        "url": "https://cloudinary.com/..."
      },
      "imageCount": 8
    }
  ]
}
```

### PUT /videos/:id

Update video name.

```
Request:
{
  "name": "Updated Name"
}

Response 200:
{ ... }
```

### DELETE /videos/:id

Delete video and all contents.

```
Response 200:
{
  "success": true,
  "deleted": {
    "frames": 4,
    "images": 12
  }
}
```

---

## Frames

### GET /videos/:videoId/frames

Get all frames in video (ordered).

```
Response 200:
[
  {
    "id": "uuid",
    "title": "Hero wakes up",
    "order": 0,
    "selectedImage": { "id": "uuid", "url": "..." } | null,
    "imageCount": 8
  },
  {
    "id": "uuid",
    "title": "Journey through forest",
    "order": 1,
    "selectedImage": null,
    "imageCount": 4
  }
]
```

### POST /videos/:videoId/frames

Create new frame (added at end).

```
Request:
{
  "title": "New Scene"
}

Response 201:
{
  "id": "uuid",
  "title": "New Scene",
  "order": 2,
  "selectedImage": null,
  "imageCount": 0
}
```

### PUT /frames/:id

Update frame title.

```
Request:
{
  "title": "Updated Title"
}

Response 200:
{ ... }
```

### PATCH /frames/:id/reorder

Change frame order.

```
Request:
{
  "newOrder": 0
}

Response 200:
[
  // All frames with updated order
]
```

### PATCH /frames/:id/selected-image

Set selected image for frame.

```
Request:
{
  "imageId": "uuid"
}

Response 200:
{
  "id": "uuid",
  "selectedImage": {
    "id": "uuid",
    "url": "https://cloudinary.com/..."
  }
}

Errors:
400 - Image not found
```

### DELETE /frames/:id

Delete frame (removes images from this frame's relation).

```
Response 200:
{
  "success": true
}
```

### DELETE /frames/:id/history

Clear frame history (delete all messages and their images).

```
Response 200:
{
  "success": true,
  "deleted": {
    "messages": 5,
    "images": 20
  }
}
```

---

## Context

### GET /videos/:videoId/context

Get context with text, images, and message history.

```
Response 200:
{
  "id": "uuid",
  "videoId": "uuid",
  "content": "Pixar animation style, vibrant colors",
  "images": [
    {
      "id": "uuid",
      "url": "https://cloudinary.com/...",
      "cloudinaryId": "video-frames/abc123"
    }
  ],
  "messages": [
    {
      "id": "uuid",
      "prompt": "cinematic, dark mood",
      "createdAt": "2024-01-15T10:00:00Z",
      "images": [
        { "id": "uuid", "url": "https://..." }
      ]
    }
  ]
}
```

### PATCH /videos/:videoId/context

Update context text.

```
Request:
{
  "content": "Pixar animation style, vibrant colors, warm lighting"
}

Response 200:
{
  "id": "uuid",
  "content": "Pixar animation style, vibrant colors, warm lighting",
  "updatedAt": "2024-01-15T10:05:00Z"
}
```

### POST /videos/:videoId/context/images

Upload image to context (reference image for generation).

```
Request (multipart/form-data):
- file: image file (png, jpg, webp)

Response 201:
{
  "id": "uuid",
  "url": "https://cloudinary.com/...",
  "cloudinaryId": "video-frames/abc123"
}

Errors:
400 - No file uploaded or invalid format
413 - File too large (max 10MB)
```

### DELETE /videos/:videoId/context/history

Clear context message history (keeps text and reference images).

```
Response 200:
{
  "success": true,
  "deleted": {
    "messages": 3,
    "images": 12
  }
}
```

---

## Image Generation

### POST /frames/:frameId/generate

Generate images for a frame.

```
Request:
{
  "prompt": "hero waking up in small village",
  "withContext": true,
  "contextImageIds": ["uuid1", "uuid2"]  // Optional: which context images to include
}

Response 201:
{
  "id": "uuid",
  "prompt": "hero waking up in small village",
  "withContext": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "images": [
    { "id": "uuid", "url": "https://cloudinary.com/...", "cloudinaryId": "..." },
    { "id": "uuid", "url": "https://cloudinary.com/...", "cloudinaryId": "..." },
    { "id": "uuid", "url": "https://cloudinary.com/...", "cloudinaryId": "..." },
    { "id": "uuid", "url": "https://cloudinary.com/...", "cloudinaryId": "..." }
  ]
}

Errors:
400 - Empty prompt
500 - OpenAI API error
```

**How context is applied:**
1. If `contextImageIds` provided → those images sent to GPT Image as input
2. If `withContext: true` → context text prepended to prompt
3. Final API call: `[context images] + [context text + prompt]`

### POST /videos/:videoId/context/generate

Generate images in context (for style exploration).

```
Request:
{
  "prompt": "cinematic style, dark mood",
  "contextImageIds": ["uuid1"]  // Optional
}

Response 201:
{
  "id": "uuid",
  "prompt": "cinematic style, dark mood",
  "withContext": false,
  "images": [ ... ]
}
```

### POST /frames/:frameId/upload

Upload image directly to a frame.

```
Request (multipart/form-data):
- file: image file (png, jpg, webp)

Response 201:
{
  "id": "uuid",
  "url": "https://cloudinary.com/...",
  "cloudinaryId": "video-frames/abc123"
}

Errors:
400 - No file uploaded or invalid format
413 - File too large (max 10MB)
```

---

## Images

### GET /projects/:projectId/images

Get all images in project, grouped by video/frame.

```
Response 200:
{
  "videos": [
    {
      "id": "uuid",
      "name": "Episode 1",
      "frames": [
        {
          "id": "uuid",
          "title": "Hero wakes up",
          "images": [
            { "id": "uuid", "url": "...", "isSelected": true }
          ]
        }
      ],
      "contextImages": [
        { "id": "uuid", "url": "..." }
      ]
    }
  ],
  "totalCount": 44
}
```

### GET /projects/:projectId/gallery

Get gallery images.

```
Response 200:
[
  {
    "id": "uuid",
    "url": "https://cloudinary.com/...",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

### DELETE /images/:id

Fully delete an image (removes from Cloudinary and all relations).

```
Response 200:
{
  "success": true
}
```

### POST /images/:id/copy

Copy image to another location. **Adds the same image to a new relation (N:M).**

Image stays in original location AND is added to target.

```
Request:
{
  "targetType": "frame" | "context" | "gallery",
  "targetId": "uuid"  // frameId, contextId, or projectId
}

Response 200:
{
  "success": true,
  "image": {
    "id": "uuid",
    "url": "..."
  }
}
```

**Example:** Copy image from context to frame
- Before: Image in Context A
- After: Image in Context A AND Frame B

### POST /images/:id/move

Move image to another location. **Removes from source, adds to target.**

```
Request:
{
  "sourceType": "frame" | "context" | "gallery",
  "sourceId": "uuid",
  "targetType": "frame" | "context" | "gallery",
  "targetId": "uuid"
}

Response 200:
{
  "success": true,
  "image": {
    "id": "uuid",
    "url": "..."
  }
}
```

**Example:** Move image from Frame A to Frame B
- Before: Image in Frame A
- After: Image in Frame B only

### POST /images/:id/remove

Remove image from a specific relation (doesn't delete the image).

```
Request:
{
  "sourceType": "frame" | "context" | "gallery",
  "sourceId": "uuid"
}

Response 200:
{
  "success": true
}
```

---

## Export (DISABLED)

> **Note:** Video export is disabled for initial development. Will be implemented in a later phase.

<!--
### POST /videos/:id/export

Generate video from selected frame images.

```
Response 200:
{
  "videoUrl": "https://cloudinary.com/video/..."
}

Errors:
400 - No frames with selected images
500 - Cloudinary error
```
-->

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Error message here",
  "code": "ERROR_CODE",
  "details": { ... }  // optional
}
```

Common HTTP status codes:
- 400 - Bad request (validation error)
- 404 - Not found
- 500 - Server error

Note: 401/403 errors will be added when authentication is enabled.
