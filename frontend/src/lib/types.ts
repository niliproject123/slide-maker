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
  mainChatId: string | null; // NEW: for main chat messages
  attachedImageIds: string[]; // Images attached as reference to the prompt
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
  images: Image[]; // Generated images
  attachedImages: Image[]; // Reference images attached to the prompt
}

export interface ContextWithImages extends Context {
  images: Image[];
  messages: MessageWithImages[];
}
