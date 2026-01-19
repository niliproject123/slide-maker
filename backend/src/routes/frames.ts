import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
  storage,
  initializeMockData,
  createFrameInternal,
  getFrameImageCount,
} from "../services/mockStorage.js";
import type { DeleteResponse, Image, MessageWithImages } from "../types/index.js";

interface VideoIdParams {
  videoId: string;
}

interface FrameIdParams {
  id: string;
}

interface CreateFrameBody {
  title: string;
}

interface UpdateFrameBody {
  title: string;
}

interface ReorderBody {
  newOrder: number;
}

interface SelectImageBody {
  imageId: string;
}

export async function frameRoutes(fastify: FastifyInstance) {
  // GET /videos/:videoId/frames - List frames in video
  fastify.get<{ Params: VideoIdParams }>(
    "/videos/:videoId/frames",
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

      const frames = Array.from(storage.frames.values())
        .filter((f) => f.videoId === videoId)
        .sort((a, b) => a.order - b.order)
        .map((frame) => {
          const selectedImage = frame.selectedImageId
            ? storage.images.get(frame.selectedImageId) || null
            : null;

          return {
            id: frame.id,
            title: frame.title,
            order: frame.order,
            selectedImage,
            imageCount: getFrameImageCount(frame.id),
          };
        });

      return reply.send(frames);
    }
  );

  // POST /videos/:videoId/frames - Create frame
  fastify.post<{ Params: VideoIdParams; Body: CreateFrameBody }>(
    "/videos/:videoId/frames",
    async (
      request: FastifyRequest<{ Params: VideoIdParams; Body: CreateFrameBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { videoId } = request.params;
      const { title } = request.body;

      const video = storage.videos.get(videoId);
      if (!video) {
        return reply.status(404).send({
          error: "Video not found",
          code: "NOT_FOUND",
        });
      }

      if (!title || typeof title !== "string" || title.trim() === "") {
        return reply.status(400).send({
          error: "Frame title is required",
          code: "VALIDATION_ERROR",
        });
      }

      const frame = createFrameInternal(videoId, title.trim());

      return reply.status(201).send({
        id: frame.id,
        title: frame.title,
        order: frame.order,
        selectedImage: null,
        imageCount: 0,
      });
    }
  );

  // PUT /frames/:id - Update frame title
  fastify.put<{ Params: FrameIdParams; Body: UpdateFrameBody }>(
    "/frames/:id",
    async (
      request: FastifyRequest<{ Params: FrameIdParams; Body: UpdateFrameBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { title } = request.body;
      const frame = storage.frames.get(id);

      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      if (!title || typeof title !== "string" || title.trim() === "") {
        return reply.status(400).send({
          error: "Frame title is required",
          code: "VALIDATION_ERROR",
        });
      }

      frame.title = title.trim();
      frame.updatedAt = new Date();

      const selectedImage = frame.selectedImageId
        ? storage.images.get(frame.selectedImageId) || null
        : null;

      return reply.send({
        id: frame.id,
        title: frame.title,
        order: frame.order,
        selectedImage,
        imageCount: getFrameImageCount(frame.id),
      });
    }
  );

  // PATCH /frames/:id/reorder - Change frame order
  fastify.patch<{ Params: FrameIdParams; Body: ReorderBody }>(
    "/frames/:id/reorder",
    async (
      request: FastifyRequest<{ Params: FrameIdParams; Body: ReorderBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { newOrder } = request.body;
      const frame = storage.frames.get(id);

      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      if (typeof newOrder !== "number" || newOrder < 0) {
        return reply.status(400).send({
          error: "Valid newOrder is required",
          code: "VALIDATION_ERROR",
        });
      }

      const videoFrames = Array.from(storage.frames.values())
        .filter((f) => f.videoId === frame.videoId)
        .sort((a, b) => a.order - b.order);

      const oldOrder = frame.order;
      const clampedNewOrder = Math.min(newOrder, videoFrames.length - 1);

      if (clampedNewOrder !== oldOrder) {
        for (const f of videoFrames) {
          if (f.id === id) {
            f.order = clampedNewOrder;
          } else if (oldOrder < clampedNewOrder && f.order > oldOrder && f.order <= clampedNewOrder) {
            f.order--;
          } else if (oldOrder > clampedNewOrder && f.order >= clampedNewOrder && f.order < oldOrder) {
            f.order++;
          }
          f.updatedAt = new Date();
        }
      }

      const updatedFrames = videoFrames
        .sort((a, b) => a.order - b.order)
        .map((f) => {
          const selectedImage = f.selectedImageId
            ? storage.images.get(f.selectedImageId) || null
            : null;

          return {
            id: f.id,
            title: f.title,
            order: f.order,
            selectedImage,
            imageCount: getFrameImageCount(f.id),
          };
        });

      return reply.send(updatedFrames);
    }
  );

  // PATCH /frames/:id/selected-image - Set selected image
  fastify.patch<{ Params: FrameIdParams; Body: SelectImageBody }>(
    "/frames/:id/selected-image",
    async (
      request: FastifyRequest<{ Params: FrameIdParams; Body: SelectImageBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { imageId } = request.body;
      const frame = storage.frames.get(id);

      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      // imageId can be null to unselect
      if (imageId !== null && imageId !== undefined) {
        const image = storage.images.get(imageId);
        if (!image) {
          return reply.status(400).send({
            error: "Image not found",
            code: "IMAGE_NOT_FOUND",
          });
        }
      }

      frame.selectedImageId = imageId || null;
      frame.updatedAt = new Date();

      const selectedImage = frame.selectedImageId
        ? storage.images.get(frame.selectedImageId) || null
        : null;

      return reply.send({
        id: frame.id,
        selectedImage,
      });
    }
  );

  // DELETE /frames/:id - Delete frame
  fastify.delete<{ Params: FrameIdParams }>(
    "/frames/:id",
    async (request: FastifyRequest<{ Params: FrameIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const frame = storage.frames.get(id);

      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      const videoId = frame.videoId;

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
        .filter((f) => f.videoId === videoId)
        .sort((a, b) => a.order - b.order);

      remainingFrames.forEach((f, idx) => {
        f.order = idx;
      });

      return reply.send({ success: true });
    }
  );

  // DELETE /frames/:id/history - Clear frame message history
  fastify.delete<{ Params: FrameIdParams }>(
    "/frames/:id/history",
    async (request: FastifyRequest<{ Params: FrameIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const frame = storage.frames.get(id);

      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      let deletedMessages = 0;
      let deletedImages = 0;

      // Delete messages and their generated images
      const messages = Array.from(storage.messages.values()).filter(
        (m) => m.frameId === id
      );
      for (const msg of messages) {
        const images = Array.from(storage.images.values()).filter(
          (img) => img.messageId === msg.id
        );
        for (const img of images) {
          // Remove from frame images
          const frameImages = storage.frameImages.get(id);
          if (frameImages) {
            frameImages.delete(img.id);
          }
          storage.images.delete(img.id);
          deletedImages++;
        }
        storage.messages.delete(msg.id);
        deletedMessages++;
      }

      // Clear selected image if it was deleted
      if (frame.selectedImageId && !storage.images.has(frame.selectedImageId)) {
        frame.selectedImageId = null;
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

  // GET /frames/:id/messages - Get frame messages with images
  fastify.get<{ Params: FrameIdParams }>(
    "/frames/:id/messages",
    async (request: FastifyRequest<{ Params: FrameIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const frame = storage.frames.get(id);

      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      const messages = Array.from(storage.messages.values())
        .filter((m) => m.frameId === id)
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

  // GET /frames/:id/images - Get all images in frame
  fastify.get<{ Params: FrameIdParams }>(
    "/frames/:id/images",
    async (request: FastifyRequest<{ Params: FrameIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const frame = storage.frames.get(id);

      if (!frame) {
        return reply.status(404).send({
          error: "Frame not found",
          code: "NOT_FOUND",
        });
      }

      const frameImageIds = storage.frameImages.get(id) || new Set();
      const images = Array.from(frameImageIds)
        .map((imgId) => storage.images.get(imgId))
        .filter((img): img is Image => img !== undefined)
        .map((img) => ({
          ...img,
          isSelected: frame.selectedImageId === img.id,
        }));

      return reply.send(images);
    }
  );
}
