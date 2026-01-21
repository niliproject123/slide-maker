import type {
  Project,
  Video,
  Context,
  Frame,
  MainChat,
  Message,
  Image,
  ProjectWithVideos,
  VideoWithDetails,
  FrameWithImages,
  MainChatWithMessages,
  MessageWithImages,
  ContextWithImages,
  CharacterWithImages,
  ModelInfo,
  ModelsResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// API methods matching mockApi interface
export const api = {
  // Projects
  projects: {
    async list(): Promise<Project[]> {
      return fetchApi<Project[]>("/projects");
    },

    async get(id: string): Promise<ProjectWithVideos | null> {
      try {
        return await fetchApi<ProjectWithVideos>(`/projects/${id}`);
      } catch {
        return null;
      }
    },

    async create(name: string): Promise<Project> {
      return fetchApi<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },

    async update(id: string, name: string): Promise<Project | null> {
      try {
        return await fetchApi<Project>(`/projects/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
      } catch {
        return null;
      }
    },

    async delete(id: string): Promise<boolean> {
      try {
        await fetchApi(`/projects/${id}`, { method: "DELETE" });
        return true;
      } catch {
        return false;
      }
    },
  },

  // Videos
  videos: {
    async list(projectId: string): Promise<Video[]> {
      return fetchApi<Video[]>(`/projects/${projectId}/videos`);
    },

    async get(id: string): Promise<VideoWithDetails | null> {
      try {
        return await fetchApi<VideoWithDetails>(`/videos/${id}`);
      } catch {
        return null;
      }
    },

    async create(projectId: string, name: string): Promise<Video> {
      return fetchApi<Video>(`/projects/${projectId}/videos`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },

    async update(id: string, name: string): Promise<Video | null> {
      try {
        return await fetchApi<Video>(`/videos/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
      } catch {
        return null;
      }
    },

    async delete(id: string): Promise<boolean> {
      try {
        await fetchApi(`/videos/${id}`, { method: "DELETE" });
        return true;
      } catch {
        return false;
      }
    },
  },

  // Frames
  frames: {
    async list(videoId: string): Promise<FrameWithImages[]> {
      return fetchApi<FrameWithImages[]>(`/videos/${videoId}/frames`);
    },

    async create(videoId: string, title: string): Promise<Frame> {
      return fetchApi<Frame>(`/videos/${videoId}/frames`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
    },

    async update(id: string, title: string): Promise<Frame | null> {
      try {
        return await fetchApi<Frame>(`/frames/${id}`, {
          method: "PUT",
          body: JSON.stringify({ title }),
        });
      } catch {
        return null;
      }
    },

    async reorder(frameId: string, newOrder: number): Promise<Frame[]> {
      return fetchApi<Frame[]>(`/frames/${frameId}/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ newOrder }),
      });
    },

    async delete(id: string): Promise<boolean> {
      try {
        await fetchApi(`/frames/${id}`, { method: "DELETE" });
        return true;
      } catch {
        return false;
      }
    },
  },

  // Context
  context: {
    async get(videoId: string): Promise<ContextWithImages | null> {
      try {
        return await fetchApi<ContextWithImages>(`/videos/${videoId}/context`);
      } catch {
        return null;
      }
    },

    async update(videoId: string, content: string): Promise<Context | null> {
      try {
        return await fetchApi<Context>(`/videos/${videoId}/context`, {
          method: "PATCH",
          body: JSON.stringify({ content }),
        });
      } catch {
        return null;
      }
    },
  },

  // Main Chats
  mainChats: {
    async list(videoId: string): Promise<MainChatWithMessages[]> {
      return fetchApi<MainChatWithMessages[]>(`/videos/${videoId}/main-chats`);
    },

    async create(videoId: string, name: string): Promise<MainChat> {
      return fetchApi<MainChat>(`/videos/${videoId}/main-chats`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },

    async update(id: string, name: string): Promise<MainChat | null> {
      try {
        return await fetchApi<MainChat>(`/main-chats/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name }),
        });
      } catch {
        return null;
      }
    },

    async delete(id: string): Promise<boolean> {
      try {
        await fetchApi(`/main-chats/${id}`, { method: "DELETE" });
        return true;
      } catch {
        return false;
      }
    },
  },

  // Image generation
  generate: {
    async images(
      frameId: string,
      prompt: string,
      withContext: boolean = false,
      attachedImageIds: string[] = [],
      options?: { model?: string; ipAdapterScale?: number; seed?: number }
    ): Promise<MessageWithImages> {
      return fetchApi<MessageWithImages>(`/frames/${frameId}/generate`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          withContext,
          contextImageIds: attachedImageIds,
          model: options?.model,
          ipAdapterScale: options?.ipAdapterScale,
          seed: options?.seed,
        }),
      });
    },

    async contextImages(
      contextId: string,
      prompt: string,
      attachedImageIds: string[] = [],
      options?: { model?: string; ipAdapterScale?: number; seed?: number }
    ): Promise<MessageWithImages> {
      // contextId is actually videoId for the API
      return fetchApi<MessageWithImages>(`/videos/${contextId}/context/generate`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          contextImageIds: attachedImageIds,
          model: options?.model,
          ipAdapterScale: options?.ipAdapterScale,
          seed: options?.seed,
        }),
      });
    },

    async mainChatImages(
      mainChatId: string,
      prompt: string,
      attachedImageIds: string[] = [],
      options?: { model?: string; ipAdapterScale?: number; seed?: number }
    ): Promise<MessageWithImages> {
      return fetchApi<MessageWithImages>(`/main-chats/${mainChatId}/generate`, {
        method: "POST",
        body: JSON.stringify({
          prompt,
          contextImageIds: attachedImageIds,
          model: options?.model,
          ipAdapterScale: options?.ipAdapterScale,
          seed: options?.seed,
        }),
      });
    },
  },

  // Images
  images: {
    async upload(
      targetType: "frame" | "context" | "gallery" | "mainChat",
      targetId: string,
      _file?: File
    ): Promise<Image> {
      let endpoint: string;
      switch (targetType) {
        case "frame":
          endpoint = `/frames/${targetId}/upload`;
          break;
        case "context":
          endpoint = `/videos/${targetId}/context/images`;
          break;
        case "gallery":
          endpoint = `/projects/${targetId}/gallery/upload`;
          break;
        case "mainChat":
          endpoint = `/main-chats/${targetId}/upload`;
          break;
      }
      return fetchApi<Image>(endpoint, { method: "POST" });
    },

    async select(frameId: string, imageId: string): Promise<Frame | null> {
      try {
        const result = await fetchApi<{ id: string; selectedImage: Image | null }>(
          `/frames/${frameId}/selected-image`,
          {
            method: "PATCH",
            body: JSON.stringify({ imageId }),
          }
        );
        // Return a partial frame with the updated selectedImageId
        return { id: result.id, selectedImageId: imageId } as Frame;
      } catch {
        return null;
      }
    },

    async copy(
      imageId: string,
      targetType: "frame" | "context" | "gallery" | "mainChat",
      targetId: string
    ): Promise<boolean> {
      try {
        await fetchApi(`/images/${imageId}/copy`, {
          method: "POST",
          body: JSON.stringify({ targetType, targetId }),
        });
        return true;
      } catch {
        return false;
      }
    },

    async move(
      imageId: string,
      sourceType: "frame" | "context" | "gallery" | "mainChat",
      sourceId: string,
      targetType: "frame" | "context" | "gallery" | "mainChat",
      targetId: string
    ): Promise<boolean> {
      try {
        await fetchApi(`/images/${imageId}/move`, {
          method: "POST",
          body: JSON.stringify({ sourceType, sourceId, targetType, targetId }),
        });
        return true;
      } catch {
        return false;
      }
    },

    async remove(
      imageId: string,
      sourceType: "frame" | "context" | "gallery" | "mainChat",
      sourceId: string
    ): Promise<boolean> {
      try {
        await fetchApi(`/images/${imageId}/remove`, {
          method: "POST",
          body: JSON.stringify({ sourceType, sourceId }),
        });
        return true;
      } catch {
        return false;
      }
    },

    async delete(imageId: string): Promise<boolean> {
      try {
        await fetchApi(`/images/${imageId}`, { method: "DELETE" });
        return true;
      } catch {
        return false;
      }
    },
  },

  // Gallery
  gallery: {
    async list(projectId: string): Promise<Image[]> {
      return fetchApi<Image[]>(`/projects/${projectId}/gallery`);
    },

    async addImage(projectId: string, imageId: string): Promise<boolean> {
      return api.images.copy(imageId, "gallery", projectId);
    },

    async removeImage(projectId: string, imageId: string): Promise<boolean> {
      return api.images.remove(imageId, "gallery", projectId);
    },
  },

  // Models
  models: {
    async list(): Promise<ModelsResponse> {
      return fetchApi<ModelsResponse>("/models");
    },

    async get(modelId: string): Promise<ModelInfo | null> {
      try {
        return await fetchApi<ModelInfo>(`/models/${modelId}`);
      } catch {
        return null;
      }
    },
  },

  // Characters
  characters: {
    async list(projectId: string): Promise<CharacterWithImages[]> {
      return fetchApi<CharacterWithImages[]>(`/projects/${projectId}/characters`);
    },

    async get(characterId: string): Promise<CharacterWithImages | null> {
      try {
        return await fetchApi<CharacterWithImages>(`/characters/${characterId}`);
      } catch {
        return null;
      }
    },

    async create(
      projectId: string,
      name: string,
      description: string = ""
    ): Promise<CharacterWithImages> {
      return fetchApi<CharacterWithImages>(`/projects/${projectId}/characters`, {
        method: "POST",
        body: JSON.stringify({ name, description }),
      });
    },

    async update(
      characterId: string,
      data: { name?: string; description?: string }
    ): Promise<CharacterWithImages | null> {
      try {
        return await fetchApi<CharacterWithImages>(`/characters/${characterId}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      } catch {
        return null;
      }
    },

    async delete(characterId: string): Promise<boolean> {
      try {
        await fetchApi(`/characters/${characterId}`, { method: "DELETE" });
        return true;
      } catch {
        return false;
      }
    },

    async addImage(
      characterId: string,
      imageIdOrUrl: { imageId?: string; imageUrl?: string }
    ): Promise<Image | null> {
      try {
        return await fetchApi<Image>(`/characters/${characterId}/images`, {
          method: "POST",
          body: JSON.stringify(imageIdOrUrl),
        });
      } catch {
        return null;
      }
    },

    async removeImage(characterId: string, imageId: string): Promise<boolean> {
      try {
        await fetchApi(`/characters/${characterId}/images/${imageId}`, {
          method: "DELETE",
        });
        return true;
      } catch {
        return false;
      }
    },
  },
};

// Export as default for easy switching
export default api;
