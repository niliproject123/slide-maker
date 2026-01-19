// Types matching the database schema

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
  frameId: string | null;
  contextId: string | null;
  mainChatId: string | null;
  attachedImageIds: string[];
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
  videos: VideoSummary[];
  galleryImages: Image[];
}

export interface VideoSummary {
  id: string;
  name: string;
  createdAt: Date;
  frameCount: number;
  imageCount: number;
}

export interface VideoWithDetails extends Video {
  context: ContextSummary | null;
  frames: FrameSummary[];
  mainChats: MainChatSummary[];
}

export interface MainChatSummary {
  id: string;
  name: string;
  messageCount: number;
  imageCount: number;
}

export interface ContextSummary {
  id: string;
  content: string;
  messageCount: number;
  imageCount: number;
}

export interface FrameSummary {
  id: string;
  title: string;
  order: number;
  selectedImage: Image | null;
  imageCount: number;
}

export interface FrameWithImages extends Frame {
  images: Image[];
  selectedImage: Image | null;
  messages: MessageWithImages[];
}

export interface MainChatWithImages extends MainChat {
  images: Image[];
  messages: MessageWithImages[];
}

export interface MessageWithImages extends Message {
  images: Image[];
  attachedImages: Image[];
}

export interface ContextWithImages extends Context {
  images: Image[];
  messages: MessageWithImages[];
}

// API Response types
export interface ProjectListItem {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  videoCount: number;
  imageCount: number;
  galleryCount: number;
}

export interface DeleteResponse {
  success: boolean;
  deleted?: {
    videos?: number;
    frames?: number;
    images?: number;
    messages?: number;
  };
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
