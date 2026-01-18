import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { storage, initializeMockData } from "../services/mockStorage.js";
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
}

interface GenerateContextBody {
  prompt: string;
  contextImageIds?: string[];
}

// Simulate generation delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      const { prompt, withContext = false, contextImageIds = [] } = request.body;

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

      // Simulate generation time
      await delay(500);

      // Create message
      const message: Message = {
        id: uuidv4(),
        prompt: prompt.trim(),
        withContext,
        frameId,
        contextId: null,
        attachedImageIds: contextImageIds,
        createdAt: new Date(),
      };
      storage.messages.set(message.id, message);

      // Get attached images for the response
      const attachedImages = contextImageIds
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
      const { prompt, contextImageIds = [] } = request.body;

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

      // Simulate generation time
      await delay(500);

      // Create message
      const message: Message = {
        id: uuidv4(),
        prompt: prompt.trim(),
        withContext: false,
        frameId: null,
        contextId: context.id,
        attachedImageIds: contextImageIds,
        createdAt: new Date(),
      };
      storage.messages.set(message.id, message);

      // Get attached images for the response
      const attachedImages = contextImageIds
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

      const response: MessageWithImages = {
        ...message,
        images,
        attachedImages,
      };

      return reply.status(201).send(response);
    }
  );

  // POST /frames/:frameId/upload - Upload image to frame (mock)
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

      // Create a mock uploaded image
      const seed = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const image: Image = {
        id: uuidv4(),
        url: `https://picsum.photos/seed/${seed}/1792/1024`,
        cloudinaryId: `mock-upload-${seed}`,
        messageId: null,
        createdAt: new Date(),
      };
      storage.images.set(image.id, image);

      // Add to frame's images
      const frameImages = storage.frameImages.get(frameId) || new Set();
      frameImages.add(image.id);
      storage.frameImages.set(frameId, frameImages);

      return reply.status(201).send(image);
    }
  );
}
