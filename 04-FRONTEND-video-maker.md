# Frontend Architecture - Video Frames Editor

## Tech Stack

```
Framework:    Next.js 14 (App Router)
Language:     TypeScript
Styling:      Tailwind CSS
Components:   shadcn/ui
State:        React Query (server) + Zustand (client)
Forms:        React Hook Form + Zod
Auth:         JWT in localStorage
```

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    → redirect to /projects
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   └── (dashboard)/
│       ├── layout.tsx              → auth guard
│       ├── projects/
│       │   └── page.tsx            → project list
│       └── project/
│           └── [projectId]/
│               ├── page.tsx        → videos list
│               ├── images/
│               │   └── page.tsx    → all images
│               ├── gallery/
│               │   └── page.tsx    → gallery
│               └── video/
│                   └── [videoId]/
│                       ├── page.tsx         → video editor
│                       ├── context/
│                       │   └── page.tsx     → context chat
│                       └── frame/
│                           └── [frameId]/
│                               └── page.tsx → frame chat
├── components/
│   ├── ui/                         → shadcn
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── BackButton.tsx
│   │   └── PageContainer.tsx
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectList.tsx
│   │   └── CreateProjectModal.tsx
│   ├── videos/
│   │   ├── VideoCard.tsx
│   │   ├── VideoList.tsx
│   │   └── CreateVideoModal.tsx
│   ├── frames/
│   │   ├── FrameCard.tsx
│   │   ├── FrameList.tsx
│   │   ├── EditFrameTitleModal.tsx
│   │   └── ReorderButtons.tsx
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── PromptInput.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   └── SelectedImage.tsx
│   ├── images/
│   │   ├── ImageGrid.tsx
│   │   ├── ImageThumbnail.tsx
│   │   ├── ImageFullscreenModal.tsx
│   │   ├── ImageUpload.tsx
│   │   ├── ImageActions.tsx
│   │   └── MoveImageModal.tsx
│   ├── context/
│   │   ├── ContextEditor.tsx
│   │   └── ContextImageManager.tsx
│   └── modals/
│       ├── ConfirmDeleteModal.tsx
│       └── AssignToFrameModal.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useProjects.ts
│   ├── useVideos.ts
│   ├── useFrames.ts
│   ├── useMessages.ts
│   ├── useImages.ts
│   └── useGenerateImage.ts
├── lib/
│   ├── api.ts                      → API client
│   ├── auth.ts                     → JWT handling
│   └── utils.ts
├── stores/
│   └── uiStore.ts                  → modals, selections
└── types/
    └── index.ts
```

---

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Email + password |
| `/signup` | Signup | Registration |
| `/projects` | Project List | All user projects |
| `/project/[id]` | Project View | Videos + gallery link |
| `/project/[id]/images` | All Images | Images by video |
| `/project/[id]/gallery` | Gallery | Incoming images |
| `/project/[id]/video/[id]` | Video Editor | Context + frames |
| `/project/[id]/video/[id]/context` | Context Chat | Context messages |
| `/project/[id]/video/[id]/frame/[id]` | Frame Chat | Frame messages |

---

## TypeScript Types

```typescript
// types/index.ts

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  videoCount: number;
  imageCount: number;
  galleryCount: number;
}

export interface Video {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  frameCount: number;
  imageCount: number;
}

export interface VideoDetail extends Video {
  context: ContextSummary;
  frames: Frame[];
}

export interface ContextSummary {
  id: string;
  messageCount: number;
  imageCount: number;
}

export interface Frame {
  id: string;
  videoId: string;
  title: string;
  order: number;
  selectedImage: Image | null;
  imageCount: number;
}

export interface Message {
  id: string;
  prompt: string;
  withContext: boolean;
  createdAt: string;
  images: Image[];
}

export interface Image {
  id: string;
  url: string;
  cloudinaryId: string;
  createdAt: string;
}

export interface GalleryImage extends Image {
  projectId: string;
}
```

---

## API Client

```typescript
// lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'API Error');
  }

  return res.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchApi<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (email: string, password: string) =>
    fetchApi<{ token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => fetchApi<User>('/auth/me'),

  // Projects
  getProjects: () => fetchApi<Project[]>('/projects'),
  
  createProject: (name: string) =>
    fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  
  getProject: (id: string) => fetchApi<Project>(`/projects/${id}`),
  
  deleteProject: (id: string) =>
    fetchApi(`/projects/${id}`, { method: 'DELETE' }),

  // Videos
  getVideos: (projectId: string) =>
    fetchApi<Video[]>(`/projects/${projectId}/videos`),
  
  createVideo: (projectId: string, name: string) =>
    fetchApi<Video>(`/projects/${projectId}/videos`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  
  getVideo: (id: string) => fetchApi<VideoDetail>(`/videos/${id}`),
  
  deleteVideo: (id: string) =>
    fetchApi(`/videos/${id}`, { method: 'DELETE' }),

  // Frames
  getFrames: (videoId: string) =>
    fetchApi<Frame[]>(`/videos/${videoId}/frames`),
  
  createFrame: (videoId: string, title: string) =>
    fetchApi<Frame>(`/videos/${videoId}/frames`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  
  updateFrame: (id: string, title: string) =>
    fetchApi<Frame>(`/frames/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }),
  
  reorderFrame: (id: string, newOrder: number) =>
    fetchApi<Frame[]>(`/frames/${id}/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ newOrder }),
    }),
  
  setSelectedImage: (frameId: string, imageId: string) =>
    fetchApi<Frame>(`/frames/${frameId}/selected-image`, {
      method: 'PATCH',
      body: JSON.stringify({ imageId }),
    }),
  
  deleteFrame: (id: string) =>
    fetchApi(`/frames/${id}`, { method: 'DELETE' }),
  
  clearFrameHistory: (id: string) =>
    fetchApi(`/frames/${id}/history`, { method: 'DELETE' }),

  // Messages
  getFrameMessages: (frameId: string) =>
    fetchApi<Message[]>(`/frames/${frameId}/messages`),
  
  getContextMessages: (videoId: string) =>
    fetchApi<Message[]>(`/videos/${videoId}/context/messages`),
  
  generateFrameImages: (frameId: string, prompt: string, withContext: boolean) =>
    fetchApi<Message>(`/frames/${frameId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt, withContext }),
    }),
  
  generateContextImages: (videoId: string, prompt: string) =>
    fetchApi<Message>(`/videos/${videoId}/context/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
  
  clearContextHistory: (videoId: string) =>
    fetchApi(`/videos/${videoId}/context/history`, { method: 'DELETE' }),

  // Images
  getProjectImages: (projectId: string) =>
    fetchApi(`/projects/${projectId}/images`),
  
  getGalleryImages: (projectId: string) =>
    fetchApi<GalleryImage[]>(`/projects/${projectId}/gallery`),
  
  deleteImage: (id: string) =>
    fetchApi(`/images/${id}`, { method: 'DELETE' }),
  
  moveImage: (id: string, target: MoveTarget) =>
    fetchApi(`/images/${id}/move`, {
      method: 'POST',
      body: JSON.stringify(target),
    }),
  
  assignGalleryImage: (id: string, frameId: string) =>
    fetchApi(`/gallery/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ frameId }),
    }),

  // Export
  exportVideo: (videoId: string) =>
    fetchApi<{ videoUrl: string }>(`/videos/${videoId}/export`, {
      method: 'POST',
    }),
};

type MoveTarget = 
  | { targetType: 'frame'; targetFrameId: string }
  | { targetType: 'gallery'; targetProjectId: string }
  | { targetType: 'frame'; targetProjectId: string; targetFrameId: string };
```

---

## React Query Hooks

```typescript
// hooks/useFrames.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useFrames(videoId: string) {
  return useQuery({
    queryKey: ['frames', videoId],
    queryFn: () => api.getFrames(videoId),
  });
}

export function useCreateFrame(videoId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (title: string) => api.createFrame(videoId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', videoId] });
    },
  });
}

export function useReorderFrame(videoId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ frameId, newOrder }: { frameId: string; newOrder: number }) =>
      api.reorderFrame(frameId, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', videoId] });
    },
  });
}

export function useSetSelectedImage(videoId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ frameId, imageId }: { frameId: string; imageId: string }) =>
      api.setSelectedImage(frameId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frames', videoId] });
    },
  });
}
```

---

## UI Store (Zustand)

```typescript
// stores/uiStore.ts

import { create } from 'zustand';

interface UIState {
  // Modals
  createProjectModalOpen: boolean;
  createVideoModalOpen: boolean;
  editFrameTitleModalOpen: boolean;
  moveImageModalOpen: boolean;
  confirmDeleteModalOpen: boolean;
  
  // Selected items
  selectedImageId: string | null;
  selectedFrameId: string | null;
  deleteTarget: { type: string; id: string; name: string } | null;
  
  // Actions
  openCreateProjectModal: () => void;
  closeCreateProjectModal: () => void;
  openMoveImageModal: (imageId: string) => void;
  closeMoveImageModal: () => void;
  openConfirmDeleteModal: (type: string, id: string, name: string) => void;
  closeConfirmDeleteModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  createProjectModalOpen: false,
  createVideoModalOpen: false,
  editFrameTitleModalOpen: false,
  moveImageModalOpen: false,
  confirmDeleteModalOpen: false,
  
  selectedImageId: null,
  selectedFrameId: null,
  deleteTarget: null,
  
  openCreateProjectModal: () => set({ createProjectModalOpen: true }),
  closeCreateProjectModal: () => set({ createProjectModalOpen: false }),
  
  openMoveImageModal: (imageId) => set({ 
    moveImageModalOpen: true, 
    selectedImageId: imageId 
  }),
  closeMoveImageModal: () => set({ 
    moveImageModalOpen: false, 
    selectedImageId: null 
  }),
  
  openConfirmDeleteModal: (type, id, name) => set({
    confirmDeleteModalOpen: true,
    deleteTarget: { type, id, name },
  }),
  closeConfirmDeleteModal: () => set({
    confirmDeleteModalOpen: false,
    deleteTarget: null,
  }),
}));
```

---

## Key Components

### PromptInput.tsx

```typescript
interface ContextImage {
  id: string;
  url: string;
}

interface PromptInputProps {
  onSubmit: (prompt: string, withContext: boolean, selectedImageIds: string[]) => void;
  isLoading: boolean;
  showContextCheckbox: boolean;
  contextImages?: ContextImage[];  // Available context images
}

export function PromptInput({ 
  onSubmit, 
  isLoading, 
  showContextCheckbox,
  contextImages = [],
}: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const [withContext, setWithContext] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt, withContext, selectedImageIds);
    setPrompt('');
  };

  const toggleImageSelection = (imageId: string) => {
    setSelectedImageIds(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  return (
    <div className="border rounded-lg p-4">
      {/* Context Images Selection */}
      {contextImages.length > 0 && (
        <div className="mb-3">
          <label className="text-sm text-muted-foreground mb-2 block">
            Include context images:
          </label>
          <div className="flex gap-2 flex-wrap">
            {contextImages.map(img => (
              <button
                key={img.id}
                onClick={() => toggleImageSelection(img.id)}
                className={cn(
                  "relative w-16 h-16 rounded border-2 overflow-hidden",
                  selectedImageIds.includes(img.id) 
                    ? "border-primary" 
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {selectedImageIds.includes(img.id) && (
                  <div className="absolute top-0 right-0 bg-primary text-white text-xs p-0.5">
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expand/Collapse Toggle */}
      <div className="flex justify-end mb-2">
        <Button 
          size="sm" 
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '↙ Collapse' : '↗ Expand'}
        </Button>
      </div>
      
      {/* Prompt Input */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want to generate..."
        className="w-full resize-none border rounded p-2"
        rows={isExpanded ? 8 : 2}
      />
      
      {/* Controls */}
      <div className="flex justify-between items-center mt-2">
        {showContextCheckbox && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={withContext}
              onChange={(e) => setWithContext(e.target.checked)}
            />
            Include context text
          </label>
        )}
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate 🎨'}
        </Button>
      </div>
    </div>
  );
}
```

### ImageThumbnail.tsx

```typescript
interface ImageThumbnailProps {
  image: Image;
  isSelected?: boolean;
  onSelect?: () => void;
  onSetAsCover?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onFullscreen?: () => void;
}

export function ImageThumbnail({
  image,
  isSelected,
  onSelect,
  onSetAsCover,
  onMove,
  onDelete,
  onFullscreen,
}: ImageThumbnailProps) {
  
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Fetch image and trigger download
    const response = await fetch(image.url);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFullscreen?.();
  };

  return (
    <div 
      className={cn(
        "relative aspect-video rounded cursor-pointer group",
        isSelected && "ring-2 ring-primary"
      )}
      onClick={onSelect}
    >
      <img
        src={image.url}
        alt=""
        className="w-full h-full object-cover rounded"
      />
      
      {isSelected && (
        <div className="absolute top-1 right-1 bg-green-500 text-white p-1 rounded">
          ✓
        </div>
      )}
      
      {/* Top-right action buttons */}
      <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          size="icon" 
          variant="secondary" 
          className="h-8 w-8"
          onClick={handleFullscreen}
          title="View fullscreen"
        >
          ⛶
        </Button>
        <Button 
          size="icon" 
          variant="secondary" 
          className="h-8 w-8"
          onClick={handleDownload}
          title="Download"
        >
          ⬇
        </Button>
      </div>
      
      {/* Bottom action buttons */}
      <div className="absolute inset-x-0 bottom-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity p-2">
        <div className="flex gap-1 justify-center">
          {onSetAsCover && (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onSetAsCover(); }}>
              Select
            </Button>
          )}
          {onMove && (
            <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onMove(); }}>
              Move
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              🗑️
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### ImageFullscreenModal.tsx

```typescript
interface ImageFullscreenModalProps {
  image: Image | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageFullscreenModal({
  image,
  isOpen,
  onClose,
}: ImageFullscreenModalProps) {
  
  const handleDownload = async () => {
    if (!image) return;
    
    const response = await fetch(image.url);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !image) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={onClose}
      >
        ✕
      </Button>
      
      {/* Download button */}
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-4 right-16 text-white hover:bg-white/20"
        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
        title="Download"
      >
        ⬇
      </Button>
      
      {/* Image */}
      <img
        src={image.url}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
```

### ImageUpload.tsx

Upload images directly to a frame.

```typescript
interface ImageUploadProps {
  frameId: string;
  onUpload: (image: Image) => void;
}

export function ImageUpload({ frameId, onUpload }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert('Please upload a PNG, JPEG, or WebP image');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/frames/${frameId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const image = await response.json();
      onUpload(image);
    } catch (error) {
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : '📤 Upload Image'}
      </Button>
    </div>
  );
}
```

### ContextImageManager.tsx

Manage context reference images.

```typescript
interface ContextImageManagerProps {
  videoId: string;
  images: ContextImage[];
  onImagesChange: () => void;  // Refresh after upload/delete
}

export function ContextImageManager({ 
  videoId, 
  images, 
  onImagesChange 
}: ContextImageManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      alert('Please upload a PNG, JPEG, or WebP image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/videos/${videoId}/context/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      onImagesChange();
    } catch (error) {
      alert('Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm('Delete this context image?')) return;

    try {
      const response = await fetch(`/api/context/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('Delete failed');
      
      onImagesChange();
    } catch (error) {
      alert('Failed to delete image');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Reference Images</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : '+ Add Image'}
          </Button>
        </div>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reference images. Upload images to use as style references.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {images.map(img => (
            <div key={img.id} className="relative group">
              <img
                src={img.url}
                alt=""
                className="w-full aspect-square object-cover rounded"
              />
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Auth Guard

```typescript
// app/(dashboard)/layout.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```
