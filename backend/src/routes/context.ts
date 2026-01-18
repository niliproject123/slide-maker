import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
  storage,
  initializeMockData,
  createImageInternal,
} from "../services/mockStorage.js";
import type { DeleteResponse, Image, MessageWithImages } from "../types/index.js";

interface VideoIdParams {
  videoId: string;
}

interface UpdateContextBody {
  content: string;
}

export async function contextRoutes(fastify: FastifyInstance) {
  // GET /videos/:videoId/context - Get context with images and messages
  fastify.get<{ Params: VideoIdParams }>(
    "/videos/:videoId/context",
    async (request: FastifyRequest<{ Params: VideoIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { videoId } = request.params;
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

      const contextImageIds = storage.contextImages.get(context.id) || new Set();
      const images = Array.from(contextImageIds)
        .map((imgId) => storage.images.get(imgId))
        .filter((img): img is Image => img !== undefined);

      const messages = Array.from(storage.messages.values())
        .filter((m) => m.contextId === context.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((msg): MessageWithImages => {
          const msgImages = Array.from(storage.images.values()).filter(
            (img) => img.messageId === msg.id
          );
          const attachedImages = (msg.attachedImageIds || [])
            .map((imgId) => storage.images.get(imgId))
            .filter((img): img is Image => img !== undefined);
          return { ...msg, images: msgImages, attachedImages };
        });

      return reply.send({
        id: context.id,
        videoId: context.videoId,
        content: context.content,
        images,
        messages,
      });
    }
  );

  // PATCH /videos/:videoId/context - Update context text
  fastify.patch<{ Params: VideoIdParams; Body: UpdateContextBody }>(
    "/videos/:videoId/context",
    async (
      request: FastifyRequest<{ Params: VideoIdParams; Body: UpdateContextBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { videoId } = request.params;
      const { content } = request.body;

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

      context.content = content || "";
      context.updatedAt = new Date();

      return reply.send({
        id: context.id,
        content: context.content,
        updatedAt: context.updatedAt,
      });
    }
  );

  // POST /videos/:videoId/context/images - Upload image to context (mock)
  fastify.post<{ Params: VideoIdParams }>(
    "/videos/:videoId/context/images",
    async (request: FastifyRequest<{ Params: VideoIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { videoId } = request.params;

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

      // Add to context images
      const contextImages = storage.contextImages.get(context.id) || new Set();
      contextImages.add(image.id);
      storage.contextImages.set(context.id, contextImages);

      return reply.status(201).send(image);
    }
  );

  // DELETE /videos/:videoId/context/history - Clear context message history
  fastify.delete<{ Params: VideoIdParams }>(
    "/videos/:videoId/context/history",
    async (request: FastifyRequest<{ Params: VideoIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { videoId } = request.params;

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

      let deletedMessages = 0;
      let deletedImages = 0;

      // Delete context messages and their generated images
      const messages = Array.from(storage.messages.values()).filter(
        (m) => m.contextId === context.id
      );
      for (const msg of messages) {
        const images = Array.from(storage.images.values()).filter(
          (img) => img.messageId === msg.id
        );
        for (const img of images) {
          // Remove from context images
          const contextImages = storage.contextImages.get(context.id);
          if (contextImages) {
            contextImages.delete(img.id);
          }
          storage.images.delete(img.id);
          deletedImages++;
        }
        storage.messages.delete(msg.id);
        deletedMessages++;
      }

      const response: DeleteResponse = {
        success: true,
        deleted: {
          messages: deletedMessages,
          images: deletedImages,
        },
      };

      return reply.send(response);
    }
  );

  // GET /videos/:videoId/context/messages - Get context messages with images
  fastify.get<{ Params: VideoIdParams }>(
    "/videos/:videoId/context/messages",
    async (request: FastifyRequest<{ Params: VideoIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { videoId } = request.params;

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

      const messages = Array.from(storage.messages.values())
        .filter((m) => m.contextId === context.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((msg): MessageWithImages => {
          const msgImages = Array.from(storage.images.values()).filter(
            (img) => img.messageId === msg.id
          );
          const attachedImages = (msg.attachedImageIds || [])
            .map((imgId) => storage.images.get(imgId))
            .filter((img): img is Image => img !== undefined);
          return { ...msg, images: msgImages, attachedImages };
        });

      return reply.send(messages);
    }
  );
}
