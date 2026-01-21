import { v4 as uuidv4 } from "uuid";
import type {
  Project,
  Video,
  Context,
  Frame,
  MainChat,
  Message,
  Image,
  Character,
} from "../types/index.js";

// In-memory storage
export const storage = {
  projects: new Map<string, Project>(),
  videos: new Map<string, Video>(),
  contexts: new Map<string, Context>(),
  frames: new Map<string, Frame>(),
  mainChats: new Map<string, MainChat>(),
  messages: new Map<string, Message>(),
  images: new Map<string, Image>(),
  characters: new Map<string, Character>(),
  // Many-to-many relations
  frameImages: new Map<string, Set<string>>(), // frameId -> Set<imageId>
  contextImages: new Map<string, Set<string>>(), // contextId -> Set<imageId>
  mainChatImages: new Map<string, Set<string>>(), // mainChatId -> Set<imageId>
  galleryImages: new Map<string, Set<string>>(), // projectId -> Set<imageId>
  characterImages: new Map<string, Set<string>>(), // characterId -> Set<imageId>
};

// Helper to create an image
export function createImageInternal(url?: string): Image {
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

// Helper to create project without triggering re-init
export function createProjectInternal(name: string): Project {
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

export function createVideoInternal(projectId: string, name: string): Video {
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

  // Create default main chat for video
  createMainChatInternal(video.id, "Main Chat");

  return video;
}

export function createMainChatInternal(videoId: string, name: string): MainChat {
  const now = new Date();
  const mainChat: MainChat = {
    id: uuidv4(),
    name,
    videoId,
    createdAt: now,
    updatedAt: now,
  };
  storage.mainChats.set(mainChat.id, mainChat);
  storage.mainChatImages.set(mainChat.id, new Set());
  return mainChat;
}

export function createFrameInternal(videoId: string, title: string): Frame {
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

// Initialize with some sample data
let initialized = false;

export function initializeMockData() {
  if (initialized) return;
  initialized = true;

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

// Helper functions for counting
export function getProjectVideoCount(projectId: string): number {
  return Array.from(storage.videos.values()).filter(
    (v) => v.projectId === projectId
  ).length;
}

export function getProjectImageCount(projectId: string): number {
  const videos = Array.from(storage.videos.values()).filter(
    (v) => v.projectId === projectId
  );
  let count = 0;
  for (const video of videos) {
    const frames = Array.from(storage.frames.values()).filter(
      (f) => f.videoId === video.id
    );
    for (const frame of frames) {
      const frameImages = storage.frameImages.get(frame.id) || new Set();
      count += frameImages.size;
    }
    const context = Array.from(storage.contexts.values()).find(
      (c) => c.videoId === video.id
    );
    if (context) {
      const contextImages = storage.contextImages.get(context.id) || new Set();
      count += contextImages.size;
    }
  }
  return count;
}

export function getProjectGalleryCount(projectId: string): number {
  const galleryImages = storage.galleryImages.get(projectId) || new Set();
  return galleryImages.size;
}

export function getVideoFrameCount(videoId: string): number {
  return Array.from(storage.frames.values()).filter(
    (f) => f.videoId === videoId
  ).length;
}

export function getVideoImageCount(videoId: string): number {
  const frames = Array.from(storage.frames.values()).filter(
    (f) => f.videoId === videoId
  );
  let count = 0;
  for (const frame of frames) {
    const frameImages = storage.frameImages.get(frame.id) || new Set();
    count += frameImages.size;
  }
  return count;
}

export function getFrameImageCount(frameId: string): number {
  const frameImages = storage.frameImages.get(frameId) || new Set();
  return frameImages.size;
}

export function getContextMessageCount(contextId: string): number {
  return Array.from(storage.messages.values()).filter(
    (m) => m.contextId === contextId
  ).length;
}

export function getContextImageCount(contextId: string): number {
  const contextImages = storage.contextImages.get(contextId) || new Set();
  return contextImages.size;
}

export function getMainChatMessageCount(mainChatId: string): number {
  return Array.from(storage.messages.values()).filter(
    (m) => m.mainChatId === mainChatId
  ).length;
}

export function getMainChatImageCount(mainChatId: string): number {
  const mainChatImages = storage.mainChatImages.get(mainChatId) || new Set();
  return mainChatImages.size;
}

// Character helpers
export function createCharacterInternal(
  projectId: string,
  name: string,
  description: string
): Character {
  const now = new Date();
  const character: Character = {
    id: uuidv4(),
    name,
    description,
    projectId,
    createdAt: now,
    updatedAt: now,
  };
  storage.characters.set(character.id, character);
  storage.characterImages.set(character.id, new Set());
  return character;
}

export function getProjectCharacterCount(projectId: string): number {
  return Array.from(storage.characters.values()).filter(
    (c) => c.projectId === projectId
  ).length;
}

export function getCharacterImageCount(characterId: string): number {
  const characterImages = storage.characterImages.get(characterId) || new Set();
  return characterImages.size;
}
