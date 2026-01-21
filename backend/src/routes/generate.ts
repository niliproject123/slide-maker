import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { storage, initializeMockData } from "../services/mockStorage.js";
import {
  generateImage,
  isOpenAIConfigured,
  type GenerateImageResult,
} from "../services/openai.js";
import type { Message, Image, MessageWithImages } from "../types/index.js";

interface FrameIdParams {
  frameId: string;
}

interface VideoIdParams {
  videoId: string;
}

interface GenerateFrameBody {
  prompt: string;
  withContext?: boolean;
  contextImageIds?: string[];
  imageCount?: number;
}

interface GenerateContextBody {
  prompt: string;
  contextImageIds?: string[];
  imageCount?: number;
}

// Generate mock image for fallback
function generateMockImage(): { url: string; cloudinaryId: string } {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {
    url: `https://picsum.photos/seed/${seed}/1792/1024`,
    cloudinaryId: `mock-${seed}`,
  };
}

// Get image URLs from image IDs
function getImageUrls(imageIds: string[]): string[] {
  return imageIds
    .map((id) => storage.images.get(id)?.url)
    .filter((url): url is string => !!url);
}

// Get context text for a video
function getContextText(videoId: string): string | undefined {
  const context = Array.from(storage.contexts.values()).find(
    (c) => c.videoId === videoId
  );
  return context?.content || undefined;
}

export async function generateRoutes(fastify: FastifyInstance) {
  // POST /frames/:frameId/generate - Generate images for frame
  fastify.post<{ Params: FrameIdParams; Body: GenerateFrameBody }>(
    "/frames/:frameId/generate",
    async (
      request: FastifyRequest<{ Params: FrameIdParams; Body: GenerateFrameBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { frameId } = request.params;
      const {
        prompt,
        withContext = false,
        contextImageIds = [],
        imageCount = 1,
      } = request.body;

      const frame = storage.frames.get(frameId);
      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        return reply.status(400).send({
          error: "Prompt is required",
          code: "VALIDATION_ERROR",
        });
      }

      // Get video for context
      const video = storage.videos.get(frame.videoId);
      const contextText = withContext && video ? getContextText(video.id) : undefined;

      // Get attached image URLs
      const attachedImageUrls = getImageUrls(contextImageIds);

      // Create message first
      const message: Message = {
        id: uuidv4(),
        prompt: prompt.trim(),
        withContext,
        frameId,
        contextId: null,
        mainChatId: null,
        attachedImageIds: contextImageIds,
        createdAt: new Date(),
      };
      storage.messages.set(message.id, message);

      // Get attached images for the response
      const attachedImages = contextImageIds
        .map((id) => storage.images.get(id))
        .filter((img): img is Image => img !== undefined);

      // Generate images
      const images: Image[] = [];
      const count = Math.min(Math.max(1, imageCount), 4);

      if (isOpenAIConfigured()) {
        // Use real OpenAI
        for (let i = 0; i < count; i++) {
          try {
            const result: GenerateImageResult = await generateImage({
              prompt: prompt.trim(),
              attachedImageUrls: attachedImageUrls.length > 0 ? attachedImageUrls : undefined,
              contextText,
            });

            const image: Image = {
              id: uuidv4(),
              url: result.url,
              cloudinaryId: `openai-${Date.now()}-${i}`,
              messageId: message.id,
              createdAt: new Date(),
            };
            storage.images.set(image.id, image);
            images.push(image);

            // Add to frame's images
            const frameImages = storage.frameImages.get(frameId) || new Set();
            frameImages.add(image.id);
            storage.frameImages.set(frameId, frameImages);
          } catch (error) {
            fastify.log.error(`Failed to generate image ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        if (images.length === 0) {
          return reply.status(500).send({
            error: "Failed to generate images",
            code: "GENERATION_ERROR",
          });
        }
      } else {
        // Fallback to mock images
        for (let i = 0; i < count; i++) {
          const mock = generateMockImage();
          const image: Image = {
            id: uuidv4(),
            url: mock.url,
            cloudinaryId: mock.cloudinaryId,
            messageId: message.id,
            createdAt: new Date(),
          };
          storage.images.set(image.id, image);
          images.push(image);

          const frameImages = storage.frameImages.get(frameId) || new Set();
          frameImages.add(image.id);
          storage.frameImages.set(frameId, frameImages);
        }
      }

      const response: MessageWithImages = {
        ...message,
        images,
        attachedImages,
      };

      return reply.status(201).send(response);
    }
  );

  // POST /videos/:videoId/context/generate - Generate images for context
  fastify.post<{ Params: VideoIdParams; Body: GenerateContextBody }>(
    "/videos/:videoId/context/generate",
    async (
      request: FastifyRequest<{ Params: VideoIdParams; Body: GenerateContextBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { videoId } = request.params;
      const { prompt, contextImageIds = [], imageCount = 1 } = request.body;

      const video = storage.videos.get(videoId);
      if (!video) {
        return reply.status(404).send({
          error: "Video not found",
          code: "NOT_FOUND",
        });
      }

      const context = Array.from(storage.contexts.values()).find(
        (c) => c.videoId === videoId
      );

      if (!context) {
        return reply.status(404).send({
          error: "Context not found",
          code: "NOT_FOUND",
        });
      }

      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        return reply.status(400).send({
          error: "Prompt is required",
          code: "VALIDATION_ERROR",
        });
      }

      // Get attached image URLs
      const attachedImageUrls = getImageUrls(contextImageIds);

      // Create message
      const message: Message = {
        id: uuidv4(),
        prompt: prompt.trim(),
        withContext: false,
        frameId: null,
        contextId: context.id,
        mainChatId: null,
        attachedImageIds: contextImageIds,
        createdAt: new Date(),
      };
      storage.messages.set(message.id, message);

      // Get attached images for the response
      const attachedImages = contextImageIds
        .map((id) => storage.images.get(id))
        .filter((img): img is Image => img !== undefined);

      // Generate images
      const images: Image[] = [];
      const count = Math.min(Math.max(1, imageCount), 4);

      if (isOpenAIConfigured()) {
        for (let i = 0; i < count; i++) {
          try {
            const result = await generateImage({
              prompt: prompt.trim(),
              attachedImageUrls: attachedImageUrls.length > 0 ? attachedImageUrls : undefined,
              contextText: context.content || undefined,
            });

            const image: Image = {
              id: uuidv4(),
              url: result.url,
              cloudinaryId: `openai-${Date.now()}-${i}`,
              messageId: message.id,
              createdAt: new Date(),
            };
            storage.images.set(image.id, image);
            images.push(image);

            const contextImages = storage.contextImages.get(context.id) || new Set();
            contextImages.add(image.id);
            storage.contextImages.set(context.id, contextImages);
          } catch (error) {
            fastify.log.error(`Failed to generate image ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        if (images.length === 0) {
          return reply.status(500).send({
            error: "Failed to generate images",
            code: "GENERATION_ERROR",
          });
        }
      } else {
        for (let i = 0; i < count; i++) {
          const mock = generateMockImage();
          const image: Image = {
            id: uuidv4(),
            url: mock.url,
            cloudinaryId: mock.cloudinaryId,
            messageId: message.id,
            createdAt: new Date(),
          };
          storage.images.set(image.id, image);
          images.push(image);

          const contextImages = storage.contextImages.get(context.id) || new Set();
          contextImages.add(image.id);
          storage.contextImages.set(context.id, contextImages);
        }
      }

      const response: MessageWithImages = {
        ...message,
        images,
        attachedImages,
      };

      return reply.status(201).send(response);
    }
  );

  // POST /frames/:frameId/upload - Upload image to frame (mock for now)
  fastify.post<{ Params: FrameIdParams }>(
    "/frames/:frameId/upload",
    async (request: FastifyRequest<{ Params: FrameIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { frameId } = request.params;

      const frame = storage.frames.get(frameId);
      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      // Create a mock uploaded image (Cloudinary integration in Phase 2.2)
      const mock = generateMockImage();
      const image: Image = {
        id: uuidv4(),
        url: mock.url,
        cloudinaryId: mock.cloudinaryId,
        messageId: null,
        createdAt: new Date(),
      };
      storage.images.set(image.id, image);

      const frameImages = storage.frameImages.get(frameId) || new Set();
      frameImages.add(image.id);
      storage.frameImages.set(frameId, frameImages);

      return reply.status(201).send(image);
    }
  );

  // POST /main-chats/:mainChatId/generate - Generate images for main chat
  fastify.post<{ Params: { mainChatId: string }; Body: GenerateContextBody }>(
    "/main-chats/:mainChatId/generate",
    async (
      request: FastifyRequest<{ Params: { mainChatId: string }; Body: GenerateContextBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { mainChatId } = request.params;
      const { prompt, contextImageIds = [], imageCount = 1 } = request.body;

      const mainChat = storage.mainChats.get(mainChatId);
      if (!mainChat) {
        return reply.status(404).send({
          error: "Main chat not found",
          code: "NOT_FOUND",
        });
      }

      if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
        return reply.status(400).send({
          error: "Prompt is required",
          code: "VALIDATION_ERROR",
        });
      }

      // Get video context
      const video = storage.videos.get(mainChat.videoId);
      const contextText = video ? getContextText(video.id) : undefined;

      // Get attached image URLs
      const attachedImageUrls = getImageUrls(contextImageIds);

      // Create message
      const message: Message = {
        id: uuidv4(),
        prompt: prompt.trim(),
        withContext: false,
        frameId: null,
        contextId: null,
        mainChatId,
        attachedImageIds: contextImageIds,
        createdAt: new Date(),
      };
      storage.messages.set(message.id, message);

      // Get attached images for the response
      const attachedImages = contextImageIds
        .map((id) => storage.images.get(id))
        .filter((img): img is Image => img !== undefined);

      // Generate images
      const images: Image[] = [];
      const count = Math.min(Math.max(1, imageCount), 4);

      if (isOpenAIConfigured()) {
        for (let i = 0; i < count; i++) {
          try {
            const result = await generateImage({
              prompt: prompt.trim(),
              attachedImageUrls: attachedImageUrls.length > 0 ? attachedImageUrls : undefined,
              contextText,
            });

            const image: Image = {
              id: uuidv4(),
              url: result.url,
              cloudinaryId: `openai-${Date.now()}-${i}`,
              messageId: message.id,
              createdAt: new Date(),
            };
            storage.images.set(image.id, image);
            images.push(image);

            const mainChatImages = storage.mainChatImages.get(mainChatId) || new Set();
            mainChatImages.add(image.id);
            storage.mainChatImages.set(mainChatId, mainChatImages);
          } catch (error) {
            fastify.log.error(`Failed to generate image ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        if (images.length === 0) {
          return reply.status(500).send({
            error: "Failed to generate images",
            code: "GENERATION_ERROR",
          });
        }
      } else {
        for (let i = 0; i < count; i++) {
          const mock = generateMockImage();
          const image: Image = {
            id: uuidv4(),
            url: mock.url,
            cloudinaryId: mock.cloudinaryId,
            messageId: message.id,
            createdAt: new Date(),
          };
          storage.images.set(image.id, image);
          images.push(image);

          const mainChatImages = storage.mainChatImages.get(mainChatId) || new Set();
          mainChatImages.add(image.id);
          storage.mainChatImages.set(mainChatId, mainChatImages);
        }
      }

      const response: MessageWithImages = {
        ...message,
        images,
        attachedImages,
      };

      return reply.status(201).send(response);
    }
  );

  // POST /main-chats/:mainChatId/upload - Upload image to main chat (mock for now)
  fastify.post<{ Params: { mainChatId: string } }>(
    "/main-chats/:mainChatId/upload",
    async (request: FastifyRequest<{ Params: { mainChatId: string } }>, reply: FastifyReply) => {
      initializeMockData();

      const { mainChatId } = request.params;

      const mainChat = storage.mainChats.get(mainChatId);
      if (!mainChat) {
        return reply.status(404).send({
          error: "Main chat not found",
          code: "NOT_FOUND",
        });
      }

      // Create a mock uploaded image (Cloudinary integration in Phase 2.2)
      const mock = generateMockImage();
      const image: Image = {
        id: uuidv4(),
        url: mock.url,
        cloudinaryId: mock.cloudinaryId,
        messageId: null,
        createdAt: new Date(),
      };
      storage.images.set(image.id, image);

      const mainChatImages = storage.mainChatImages.get(mainChatId) || new Set();
      mainChatImages.add(image.id);
      storage.mainChatImages.set(mainChatId, mainChatImages);

      return reply.status(201).send(image);
    }
  );
}
