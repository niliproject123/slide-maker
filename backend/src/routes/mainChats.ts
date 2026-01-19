import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  storage,
  initializeMockData,
  createMainChatInternal,
  getMainChatMessageCount,
  getMainChatImageCount,
} from "../services/mockStorage.js";
import type { DeleteResponse, Image, MessageWithImages } from "../types/index.js";

interface VideoIdParams {
  videoId: string;
}

interface MainChatIdParams {
  id: string;
}

interface CreateMainChatBody {
  name: string;
}

interface UpdateMainChatBody {
  name: string;
}

export async function mainChatRoutes(fastify: FastifyInstance) {
  // GET /videos/:videoId/main-chats - List main chats in video
  fastify.get<{ Params: VideoIdParams }>(
    "/videos/:videoId/main-chats",
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

      const mainChats = Array.from(storage.mainChats.values())
        .filter((mc) => mc.videoId === videoId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((mainChat) => ({
          id: mainChat.id,
          name: mainChat.name,
          videoId: mainChat.videoId,
          createdAt: mainChat.createdAt,
          updatedAt: mainChat.updatedAt,
          messageCount: getMainChatMessageCount(mainChat.id),
          imageCount: getMainChatImageCount(mainChat.id),
        }));

      return reply.send(mainChats);
    }
  );

  // POST /videos/:videoId/main-chats - Create main chat
  fastify.post<{ Params: VideoIdParams; Body: CreateMainChatBody }>(
    "/videos/:videoId/main-chats",
    async (
      request: FastifyRequest<{ Params: VideoIdParams; Body: CreateMainChatBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { videoId } = request.params;
      const { name } = request.body;

      const video = storage.videos.get(videoId);
      if (!video) {
        return reply.status(404).send({
          error: "Video not found",
          code: "NOT_FOUND",
        });
      }

      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply.status(400).send({
          error: "Main chat name is required",
          code: "VALIDATION_ERROR",
        });
      }

      const mainChat = createMainChatInternal(videoId, name.trim());

      return reply.status(201).send({
        id: mainChat.id,
        name: mainChat.name,
        videoId: mainChat.videoId,
        createdAt: mainChat.createdAt,
        updatedAt: mainChat.updatedAt,
        messageCount: 0,
        imageCount: 0,
      });
    }
  );

  // GET /main-chats/:id - Get main chat with messages
  fastify.get<{ Params: MainChatIdParams }>(
    "/main-chats/:id",
    async (request: FastifyRequest<{ Params: MainChatIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const mainChat = storage.mainChats.get(id);

      if (!mainChat) {
        return reply.status(404).send({
          error: "Main chat not found",
          code: "NOT_FOUND",
        });
      }

      const mainChatImageIds = storage.mainChatImages.get(id) || new Set();
      const images = Array.from(mainChatImageIds)
        .map((imgId) => storage.images.get(imgId))
        .filter((img): img is Image => img !== undefined);

      const messages = Array.from(storage.messages.values())
        .filter((m) => m.mainChatId === id)
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
        id: mainChat.id,
        name: mainChat.name,
        videoId: mainChat.videoId,
        createdAt: mainChat.createdAt,
        updatedAt: mainChat.updatedAt,
        images,
        messages,
      });
    }
  );

  // PUT /main-chats/:id - Update main chat name
  fastify.put<{ Params: MainChatIdParams; Body: UpdateMainChatBody }>(
    "/main-chats/:id",
    async (
      request: FastifyRequest<{ Params: MainChatIdParams; Body: UpdateMainChatBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { name } = request.body;
      const mainChat = storage.mainChats.get(id);

      if (!mainChat) {
        return reply.status(404).send({
          error: "Main chat not found",
          code: "NOT_FOUND",
        });
      }

      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply.status(400).send({
          error: "Main chat name is required",
          code: "VALIDATION_ERROR",
        });
      }

      mainChat.name = name.trim();
      mainChat.updatedAt = new Date();

      return reply.send({
        id: mainChat.id,
        name: mainChat.name,
        videoId: mainChat.videoId,
        createdAt: mainChat.createdAt,
        updatedAt: mainChat.updatedAt,
      });
    }
  );

  // DELETE /main-chats/:id - Delete main chat
  fastify.delete<{ Params: MainChatIdParams }>(
    "/main-chats/:id",
    async (request: FastifyRequest<{ Params: MainChatIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const mainChat = storage.mainChats.get(id);

      if (!mainChat) {
        return reply.status(404).send({
          error: "Main chat not found",
          code: "NOT_FOUND",
        });
      }

      let deletedMessages = 0;
      let deletedImages = 0;

      // Delete messages and their images
      const messages = Array.from(storage.messages.values()).filter(
        (m) => m.mainChatId === id
      );
      for (const msg of messages) {
        const images = Array.from(storage.images.values()).filter(
          (img) => img.messageId === msg.id
        );
        for (const img of images) {
          storage.images.delete(img.id);
          deletedImages++;
        }
        storage.messages.delete(msg.id);
        deletedMessages++;
      }

      storage.mainChatImages.delete(id);
      storage.mainChats.delete(id);

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

  // DELETE /main-chats/:id/history - Clear main chat message history
  fastify.delete<{ Params: MainChatIdParams }>(
    "/main-chats/:id/history",
    async (request: FastifyRequest<{ Params: MainChatIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const mainChat = storage.mainChats.get(id);

      if (!mainChat) {
        return reply.status(404).send({
          error: "Main chat not found",
          code: "NOT_FOUND",
        });
      }

      let deletedMessages = 0;
      let deletedImages = 0;

      // Delete messages and their generated images
      const messages = Array.from(storage.messages.values()).filter(
        (m) => m.mainChatId === id
      );
      for (const msg of messages) {
        const images = Array.from(storage.images.values()).filter(
          (img) => img.messageId === msg.id
        );
        for (const img of images) {
          // Remove from main chat images
          const mainChatImages = storage.mainChatImages.get(id);
          if (mainChatImages) {
            mainChatImages.delete(img.id);
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
}
