import { v4 as uuidv4 } from "uuid";
import type {
  Project,
  Video,
  Context,
  Frame,
  Message,
  Image,
  ProjectWithVideos,
  VideoWithDetails,
  FrameWithImages,
  MessageWithImages,
  ContextWithImages,
} from "./types";

// In-memory storage
const storage = {
  projects: new Map<string, Project>(),
  videos: new Map<string, Video>(),
  contexts: new Map<string, Context>(),
  frames: new Map<string, Frame>(),
  messages: new Map<string, Message>(),
  images: new Map<string, Image>(),
  // Many-to-many relations
  frameImages: new Map<string, Set<string>>(), // frameId -> Set<imageId>
  contextImages: new Map<string, Set<string>>(), // contextId -> Set<imageId>
  galleryImages: new Map<string, Set<string>>(), // projectId -> Set<imageId>
};

// Helper to create an image
function createImageInternal(url?: string): Image {
  const seed = `init-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const image: Image = {
    id: uuidv4(),
    url: url || `https://picsum.photos/seed/${seed}/1792/1024`,
    cloudinaryId: `mock-${seed}`,
    messageId: null,
    createdAt: new Date(),
  };
  storage.images.set(image.id, image);
  return image;
}

// Initialize with some sample data
function initializeMockData() {
  if (storage.projects.size > 0) return;

  // Create a sample project
  const project1 = createProjectInternal("My First Video Project");
  const project2 = createProjectInternal("Marketing Campaign");

  // Create videos for project1
  const video1 = createVideoInternal(project1.id, "Product Demo");
  const video2 = createVideoInternal(project1.id, "Tutorial Video");

  // Create frames for video1
  createFrameInternal(video1.id, "Introduction");
  createFrameInternal(video1.id, "Main Features");
  createFrameInternal(video1.id, "Conclusion");

  // Create frames for video2
  createFrameInternal(video2.id, "Welcome");
  createFrameInternal(video2.id, "Step 1");

  // Create a video for project2
  const video3 = createVideoInternal(project2.id, "Brand Story");
  createFrameInternal(video3.id, "Opening Scene");

  // Add fake images to gallery for project1
  const galleryImages1 = storage.galleryImages.get(project1.id) || new Set();
  for (let i = 0; i < 6; i++) {
    const img = createImageInternal(`https://picsum.photos/seed/gallery-${i}/1792/1024`);
    galleryImages1.add(img.id);
  }
  storage.galleryImages.set(project1.id, galleryImages1);

  // Add fake images to gallery for project2
  const galleryImages2 = storage.galleryImages.get(project2.id) || new Set();
  for (let i = 0; i < 3; i++) {
    const img = createImageInternal(`https://picsum.photos/seed/gallery2-${i}/1792/1024`);
    galleryImages2.add(img.id);
  }
  storage.galleryImages.set(project2.id, galleryImages2);
}

// Helper to create project without triggering re-init
function createProjectInternal(name: string): Project {
  const now = new Date();
  const project: Project = {
    id: uuidv4(),
    name,
    createdAt: now,
    updatedAt: now,
  };
  storage.projects.set(project.id, project);
  storage.galleryImages.set(project.id, new Set());
  return project;
}

function createVideoInternal(projectId: string, name: string): Video {
  const now = new Date();
  const video: Video = {
    id: uuidv4(),
    name,
    projectId,
    createdAt: now,
    updatedAt: now,
  };
  storage.videos.set(video.id, video);

  // Create context for video
  const context: Context = {
    id: uuidv4(),
    content: "",
    videoId: video.id,
    createdAt: now,
    updatedAt: now,
  };
  storage.contexts.set(context.id, context);
  storage.contextImages.set(context.id, new Set());

  return video;
}

function createFrameInternal(videoId: string, title: string): Frame {
  const now = new Date();
  const frames = Array.from(storage.frames.values()).filter(
    (f) => f.videoId === videoId
  );
  const frame: Frame = {
    id: uuidv4(),
    title,
    order: frames.length,
    videoId,
    selectedImageId: null,
    createdAt: now,
    updatedAt: now,
  };
  storage.frames.set(frame.id, frame);
  storage.frameImages.set(frame.id, new Set());
  return frame;
}

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// API methods
export const mockApi = {
  // Projects
  projects: {
    async list(): Promise<Project[]> {
      initializeMockData();
      await delay(100);
      return Array.from(storage.projects.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    async get(id: string): Promise<ProjectWithVideos | null> {
      initializeMockData();
      await delay(100);
      const project = storage.projects.get(id);
      if (!project) return null;

      const videos = Array.from(storage.videos.values())
        .filter((v) => v.projectId === id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      const galleryImageIds = storage.galleryImages.get(id) || new Set();
      const galleryImages = Array.from(galleryImageIds)
        .map((imgId) => storage.images.get(imgId))
        .filter((img): img is Image => img !== undefined);

      return { ...project, videos, galleryImages };
    },

    async create(name: string): Promise<Project> {
      initializeMockData();
      await delay(150);
      return createProjectInternal(name);
    },

    async update(id: string, name: string): Promise<Project | null> {
      initializeMockData();
      await delay(100);
      const project = storage.projects.get(id);
      if (!project) return null;

      project.name = name;
      project.updatedAt = new Date();
      return project;
    },

    async delete(id: string): Promise<boolean> {
      initializeMockData();
      await delay(150);
      const project = storage.projects.get(id);
      if (!project) return false;

      // Cascade delete videos
      const videos = Array.from(storage.videos.values()).filter(
        (v) => v.projectId === id
      );
      for (const video of videos) {
        await mockApi.videos.delete(video.id);
      }

      // Clean up gallery images relation
      storage.galleryImages.delete(id);
      storage.projects.delete(id);
      return true;
    },
  },

  // Videos
  videos: {
    async list(projectId: string): Promise<Video[]> {
      initializeMockData();
      await delay(100);
      return Array.from(storage.videos.values())
        .filter((v) => v.projectId === projectId)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },

    async get(id: string): Promise<VideoWithDetails | null> {
      initializeMockData();
      await delay(100);
      const video = storage.videos.get(id);
      if (!video) return null;

      const context =
        Array.from(storage.contexts.values()).find(
          (c) => c.videoId === id
        ) || null;

      const frames = Array.from(storage.frames.values())
        .filter((f) => f.videoId === id)
        .sort((a, b) => a.order - b.order)
        .map((frame): FrameWithImages => {
          const imageIds = storage.frameImages.get(frame.id) || new Set();
          const images = Array.from(imageIds)
            .map((imgId) => storage.images.get(imgId))
            .filter((img): img is Image => img !== undefined);

          const messages = Array.from(storage.messages.values())
            .filter((m) => m.frameId === frame.id)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )
            .map((msg): MessageWithImages => {
              const msgImages = Array.from(storage.images.values()).filter(
                (img) => img.messageId === msg.id
              );
              const attachedImages = (msg.attachedImageIds || [])
                .map((id) => storage.images.get(id))
                .filter((img): img is Image => img !== undefined);
              return { ...msg, images: msgImages, attachedImages };
            });

          const selectedImage = frame.selectedImageId
            ? storage.images.get(frame.selectedImageId) || null
            : null;

          return { ...frame, images, selectedImage, messages };
        });

      return { ...video, context, frames };
    },

    async create(projectId: string, name: string): Promise<Video> {
      initializeMockData();
      await delay(150);
      return createVideoInternal(projectId, name);
    },

    async update(id: string, name: string): Promise<Video | null> {
      initializeMockData();
      await delay(100);
      const video = storage.videos.get(id);
      if (!video) return null;

      video.name = name;
      video.updatedAt = new Date();
      return video;
    },

    async delete(id: string): Promise<boolean> {
      initializeMockData();
      await delay(150);
      const video = storage.videos.get(id);
      if (!video) return false;

      // Delete frames
      const frames = Array.from(storage.frames.values()).filter(
        (f) => f.videoId === id
      );
      for (const frame of frames) {
        storage.frameImages.delete(frame.id);
        // Delete messages
        const messages = Array.from(storage.messages.values()).filter(
          (m) => m.frameId === frame.id
        );
        for (const msg of messages) {
          // Delete images from this message
          const images = Array.from(storage.images.values()).filter(
            (img) => img.messageId === msg.id
          );
          for (const img of images) {
            storage.images.delete(img.id);
          }
          storage.messages.delete(msg.id);
        }
        storage.frames.delete(frame.id);
      }

      // Delete context
      const context = Array.from(storage.contexts.values()).find(
        (c) => c.videoId === id
      );
      if (context) {
        storage.contextImages.delete(context.id);
        storage.contexts.delete(context.id);
      }

      storage.videos.delete(id);
      return true;
    },
  },

  // Frames
  frames: {
    async list(videoId: string): Promise<FrameWithImages[]> {
      initializeMockData();
      await delay(100);
      return Array.from(storage.frames.values())
        .filter((f) => f.videoId === videoId)
        .sort((a, b) => a.order - b.order)
        .map((frame): FrameWithImages => {
          const imageIds = storage.frameImages.get(frame.id) || new Set();
          const images = Array.from(imageIds)
            .map((imgId) => storage.images.get(imgId))
            .filter((img): img is Image => img !== undefined);

          const messages = Array.from(storage.messages.values())
            .filter((m) => m.frameId === frame.id)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )
            .map((msg): MessageWithImages => {
              const msgImages = Array.from(storage.images.values()).filter(
                (img) => img.messageId === msg.id
              );
              const attachedImages = (msg.attachedImageIds || [])
                .map((id) => storage.images.get(id))
                .filter((img): img is Image => img !== undefined);
              return { ...msg, images: msgImages, attachedImages };
            });

          const selectedImage = frame.selectedImageId
            ? storage.images.get(frame.selectedImageId) || null
            : null;

          return { ...frame, images, selectedImage, messages };
        });
    },

    async create(videoId: string, title: string): Promise<Frame> {
      initializeMockData();
      await delay(150);
      return createFrameInternal(videoId, title);
    },

    async update(id: string, title: string): Promise<Frame | null> {
      initializeMockData();
      await delay(100);
      const frame = storage.frames.get(id);
      if (!frame) return null;

      frame.title = title;
      frame.updatedAt = new Date();
      return frame;
    },

    async reorder(frameId: string, newOrder: number): Promise<Frame[]> {
      initializeMockData();
      await delay(100);
      const frame = storage.frames.get(frameId);
      if (!frame) return [];

      const videoFrames = Array.from(storage.frames.values())
        .filter((f) => f.videoId === frame.videoId)
        .sort((a, b) => a.order - b.order);

      const oldOrder = frame.order;
      if (newOrder === oldOrder) return videoFrames;

      // Reorder
      for (const f of videoFrames) {
        if (f.id === frameId) {
          f.order = newOrder;
        } else if (oldOrder < newOrder && f.order > oldOrder && f.order <= newOrder) {
          f.order--;
        } else if (oldOrder > newOrder && f.order >= newOrder && f.order < oldOrder) {
          f.order++;
        }
        f.updatedAt = new Date();
      }

      return videoFrames.sort((a, b) => a.order - b.order);
    },

    async delete(id: string): Promise<boolean> {
      initializeMockData();
      await delay(150);
      const frame = storage.frames.get(id);
      if (!frame) return false;

      // Delete messages and their images
      const messages = Array.from(storage.messages.values()).filter(
        (m) => m.frameId === id
      );
      for (const msg of messages) {
        const images = Array.from(storage.images.values()).filter(
          (img) => img.messageId === msg.id
        );
        for (const img of images) {
          storage.images.delete(img.id);
        }
        storage.messages.delete(msg.id);
      }

      storage.frameImages.delete(id);
      storage.frames.delete(id);

      // Reorder remaining frames
      const remainingFrames = Array.from(storage.frames.values())
        .filter((f) => f.videoId === frame.videoId)
        .sort((a, b) => a.order - b.order);

      remainingFrames.forEach((f, idx) => {
        f.order = idx;
      });

      return true;
    },
  },

  // Context
  context: {
    async get(videoId: string): Promise<ContextWithImages | null> {
      initializeMockData();
      await delay(100);
      const context = Array.from(storage.contexts.values()).find(
        (c) => c.videoId === videoId
      );
      if (!context) return null;

      const imageIds = storage.contextImages.get(context.id) || new Set();
      const images = Array.from(imageIds)
        .map((imgId) => storage.images.get(imgId))
        .filter((img): img is Image => img !== undefined);

      const messages = Array.from(storage.messages.values())
        .filter((m) => m.contextId === context.id)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        .map((msg): MessageWithImages => {
          const msgImages = Array.from(storage.images.values()).filter(
            (img) => img.messageId === msg.id
          );
          const attachedImages = (msg.attachedImageIds || [])
            .map((id) => storage.images.get(id))
            .filter((img): img is Image => img !== undefined);
          return { ...msg, images: msgImages, attachedImages };
        });

      return { ...context, images, messages };
    },

    async update(videoId: string, content: string): Promise<Context | null> {
      initializeMockData();
      await delay(100);
      const context = Array.from(storage.contexts.values()).find(
        (c) => c.videoId === videoId
      );
      if (!context) return null;

      context.content = content;
      context.updatedAt = new Date();
      return context;
    },
  },

  // Image generation
  generate: {
    async images(
      frameId: string,
      prompt: string,
      withContext: boolean = false,
      attachedImageIds: string[] = []
    ): Promise<MessageWithImages> {
      initializeMockData();
      await delay(500); // Simulate generation time

      const frame = storage.frames.get(frameId);
      if (!frame) throw new Error("Frame not found");

      // Create message
      const message: Message = {
        id: uuidv4(),
        prompt,
        withContext,
        frameId,
        contextId: null,
        attachedImageIds,
        createdAt: new Date(),
      };
      storage.messages.set(message.id, message);

      // Get attached images
      const attachedImages = attachedImageIds
        .map((id) => storage.images.get(id))
        .filter((img): img is Image => img !== undefined);

      // Generate 4 placeholder images using picsum
      const images: Image[] = [];
      for (let i = 0; i < 4; i++) {
        const seed = `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
        const image: Image = {
          id: uuidv4(),
          url: `https://picsum.photos/seed/${seed}/1792/1024`,
          cloudinaryId: `mock-${seed}`,
          messageId: message.id,
          createdAt: new Date(),
        };
        storage.images.set(image.id, image);
        images.push(image);

        // Add to frame's images
        const frameImages = storage.frameImages.get(frameId) || new Set();
        frameImages.add(image.id);
        storage.frameImages.set(frameId, frameImages);
      }

      return { ...message, images, attachedImages };
    },

    async contextImages(
      contextId: string,
      prompt: string,
      attachedImageIds: string[] = []
    ): Promise<MessageWithImages> {
      initializeMockData();
      await delay(500);

      const context = storage.contexts.get(contextId);
      if (!context) throw new Error("Context not found");

      // Create message
      const message: Message = {
        id: uuidv4(),
        prompt,
        withContext: false,
        frameId: null,
        contextId,
        attachedImageIds,
        createdAt: new Date(),
      };
      storage.messages.set(message.id, message);

      // Get attached images
      const attachedImages = attachedImageIds
        .map((id) => storage.images.get(id))
        .filter((img): img is Image => img !== undefined);

      // Generate 4 placeholder images
      const images: Image[] = [];
      for (let i = 0; i < 4; i++) {
        const seed = `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
        const image: Image = {
          id: uuidv4(),
          url: `https://picsum.photos/seed/${seed}/1792/1024`,
          cloudinaryId: `mock-${seed}`,
          messageId: message.id,
          createdAt: new Date(),
        };
        storage.images.set(image.id, image);
        images.push(image);

        // Add to context's images
        const contextImages = storage.contextImages.get(context.id) || new Set();
        contextImages.add(image.id);
        storage.contextImages.set(context.id, contextImages);
      }

      return { ...message, images, attachedImages };
    },
  },

  // Images
  images: {
    async upload(
      targetType: "frame" | "context" | "gallery",
      targetId: string,
      _file?: File // In real impl, this would be used
    ): Promise<Image> {
      initializeMockData();
      await delay(300); // Simulate upload time

      // Create a fake uploaded image using picsum
      const seed = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const image: Image = {
        id: uuidv4(),
        url: `https://picsum.photos/seed/${seed}/1792/1024`,
        cloudinaryId: `mock-upload-${seed}`,
        messageId: null,
        createdAt: new Date(),
      };
      storage.images.set(image.id, image);

      // Add to target
      switch (targetType) {
        case "frame": {
          const frameImages = storage.frameImages.get(targetId) || new Set();
          frameImages.add(image.id);
          storage.frameImages.set(targetId, frameImages);
          break;
        }
        case "context": {
          const contextImages = storage.contextImages.get(targetId) || new Set();
          contextImages.add(image.id);
          storage.contextImages.set(targetId, contextImages);
          break;
        }
        case "gallery": {
          const galleryImages = storage.galleryImages.get(targetId) || new Set();
          galleryImages.add(image.id);
          storage.galleryImages.set(targetId, galleryImages);
          break;
        }
      }

      return image;
    },

    async select(frameId: string, imageId: string): Promise<Frame | null> {
      initializeMockData();
      await delay(100);
      const frame = storage.frames.get(frameId);
      if (!frame) return null;

      frame.selectedImageId = imageId;
      frame.updatedAt = new Date();
      return frame;
    },

    async copy(
      imageId: string,
      targetType: "frame" | "context" | "gallery",
      targetId: string
    ): Promise<boolean> {
      initializeMockData();
      await delay(100);
      const image = storage.images.get(imageId);
      if (!image) return false;

      switch (targetType) {
        case "frame": {
          const frameImages = storage.frameImages.get(targetId) || new Set();
          frameImages.add(imageId);
          storage.frameImages.set(targetId, frameImages);
          break;
        }
        case "context": {
          const contextImages = storage.contextImages.get(targetId) || new Set();
          contextImages.add(imageId);
          storage.contextImages.set(targetId, contextImages);
          break;
        }
        case "gallery": {
          const galleryImages = storage.galleryImages.get(targetId) || new Set();
          galleryImages.add(imageId);
          storage.galleryImages.set(targetId, galleryImages);
          break;
        }
      }

      return true;
    },

    async move(
      imageId: string,
      sourceType: "frame" | "context" | "gallery",
      sourceId: string,
      targetType: "frame" | "context" | "gallery",
      targetId: string
    ): Promise<boolean> {
      initializeMockData();
      await delay(100);

      // Remove from source
      await mockApi.images.remove(imageId, sourceType, sourceId);

      // Add to target
      await mockApi.images.copy(imageId, targetType, targetId);

      return true;
    },

    async remove(
      imageId: string,
      sourceType: "frame" | "context" | "gallery",
      sourceId: string
    ): Promise<boolean> {
      initializeMockData();
      await delay(100);

      switch (sourceType) {
        case "frame": {
          const frameImages = storage.frameImages.get(sourceId);
          if (frameImages) {
            frameImages.delete(imageId);
            // If this was the selected image, unselect it
            const frame = storage.frames.get(sourceId);
            if (frame && frame.selectedImageId === imageId) {
              frame.selectedImageId = null;
            }
          }
          break;
        }
        case "context": {
          const contextImages = storage.contextImages.get(sourceId);
          if (contextImages) {
            contextImages.delete(imageId);
          }
          break;
        }
        case "gallery": {
          const galleryImages = storage.galleryImages.get(sourceId);
          if (galleryImages) {
            galleryImages.delete(imageId);
          }
          break;
        }
      }

      return true;
    },

    async delete(imageId: string): Promise<boolean> {
      initializeMockData();
      await delay(150);

      // Remove from all relations
      for (const frameImages of storage.frameImages.values()) {
        frameImages.delete(imageId);
      }
      for (const contextImages of storage.contextImages.values()) {
        contextImages.delete(imageId);
      }
      for (const galleryImages of storage.galleryImages.values()) {
        galleryImages.delete(imageId);
      }

      // Unselect from any frames
      for (const frame of storage.frames.values()) {
        if (frame.selectedImageId === imageId) {
          frame.selectedImageId = null;
        }
      }

      storage.images.delete(imageId);
      return true;
    },
  },

  // Gallery
  gallery: {
    async list(projectId: string): Promise<Image[]> {
      initializeMockData();
      await delay(100);
      const galleryImageIds = storage.galleryImages.get(projectId) || new Set();
      return Array.from(galleryImageIds)
        .map((imgId) => storage.images.get(imgId))
        .filter((img): img is Image => img !== undefined)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    },

    async addImage(projectId: string, imageId: string): Promise<boolean> {
      return mockApi.images.copy(imageId, "gallery", projectId);
    },

    async removeImage(projectId: string, imageId: string): Promise<boolean> {
      return mockApi.images.remove(imageId, "gallery", projectId);
    },
  },
};
