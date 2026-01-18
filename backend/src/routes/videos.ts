import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  storage,
  initializeMockData,
  createVideoInternal,
  getVideoFrameCount,
  getVideoImageCount,
  getContextMessageCount,
  getContextImageCount,
  getFrameImageCount,
} from "../services/mockStorage.js";
import type { DeleteResponse, Image } from "../types/index.js";

interface ProjectIdParams {
  projectId: string;
}

interface VideoIdParams {
  id: string;
}

interface CreateVideoBody {
  name: string;
}

interface UpdateVideoBody {
  name: string;
}

export async function videoRoutes(fastify: FastifyInstance) {
  // GET /projects/:projectId/videos - List videos in project
  fastify.get<{ Params: ProjectIdParams }>(
    "/projects/:projectId/videos",
    async (request: FastifyRequest<{ Params: ProjectIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { projectId } = request.params;
      const project = storage.projects.get(projectId);

      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      const videos = Array.from(storage.videos.values())
        .filter((v) => v.projectId === projectId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((video) => ({
          id: video.id,
          name: video.name,
          createdAt: video.createdAt,
          frameCount: getVideoFrameCount(video.id),
          imageCount: getVideoImageCount(video.id),
        }));

      return reply.send(videos);
    }
  );

  // POST /projects/:projectId/videos - Create video
  fastify.post<{ Params: ProjectIdParams; Body: CreateVideoBody }>(
    "/projects/:projectId/videos",
    async (
      request: FastifyRequest<{ Params: ProjectIdParams; Body: CreateVideoBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { projectId } = request.params;
      const { name } = request.body;

      const project = storage.projects.get(projectId);
      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply.status(400).send({
          error: "Video name is required",
          code: "VALIDATION_ERROR",
        });
      }

      const video = createVideoInternal(projectId, name.trim());

      // Get the created context
      const context = Array.from(storage.contexts.values()).find(
        (c) => c.videoId === video.id
      );

      return reply.status(201).send({
        id: video.id,
        name: video.name,
        createdAt: video.createdAt,
        context: context
          ? {
              id: context.id,
              messageCount: 0,
            }
          : null,
        frames: [],
      });
    }
  );

  // GET /videos/:id - Get video with context and frames
  fastify.get<{ Params: VideoIdParams }>(
    "/videos/:id",
    async (request: FastifyRequest<{ Params: VideoIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const video = storage.videos.get(id);

      if (!video) {
        return reply.status(404).send({
          error: "Video not found",
          code: "NOT_FOUND",
        });
      }

      const context = Array.from(storage.contexts.values()).find(
        (c) => c.videoId === id
      );

      const frames = Array.from(storage.frames.values())
        .filter((f) => f.videoId === id)
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

      return reply.send({
        id: video.id,
        name: video.name,
        projectId: video.projectId,
        context: context
          ? {
              id: context.id,
              content: context.content,
              messageCount: getContextMessageCount(context.id),
              imageCount: getContextImageCount(context.id),
            }
          : null,
        frames,
      });
    }
  );

  // PUT /videos/:id - Update video name
  fastify.put<{ Params: VideoIdParams; Body: UpdateVideoBody }>(
    "/videos/:id",
    async (
      request: FastifyRequest<{ Params: VideoIdParams; Body: UpdateVideoBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { name } = request.body;
      const video = storage.videos.get(id);

      if (!video) {
        return reply.status(404).send({
          error: "Video not found",
          code: "NOT_FOUND",
        });
      }

      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply.status(400).send({
          error: "Video name is required",
          code: "VALIDATION_ERROR",
        });
      }

      video.name = name.trim();
      video.updatedAt = new Date();

      return reply.send({
        id: video.id,
        name: video.name,
        projectId: video.projectId,
        createdAt: video.createdAt,
        updatedAt: video.updatedAt,
      });
    }
  );

  // DELETE /videos/:id - Delete video and all contents
  fastify.delete<{ Params: VideoIdParams }>(
    "/videos/:id",
    async (request: FastifyRequest<{ Params: VideoIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const video = storage.videos.get(id);

      if (!video) {
        return reply.status(404).send({
          error: "Video not found",
          code: "NOT_FOUND",
        });
      }

      let deletedFrames = 0;
      let deletedImages = 0;

      // Delete frames
      const frames = Array.from(storage.frames.values()).filter(
        (f) => f.videoId === id
      );
      for (const frame of frames) {
        const frameImages = storage.frameImages.get(frame.id) || new Set();
        deletedImages += frameImages.size;
        storage.frameImages.delete(frame.id);

        // Delete messages
        const messages = Array.from(storage.messages.values()).filter(
          (m) => m.frameId === frame.id
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
        storage.frames.delete(frame.id);
        deletedFrames++;
      }

      // Delete context
      const context = Array.from(storage.contexts.values()).find(
        (c) => c.videoId === id
      );
      if (context) {
        const contextImages = storage.contextImages.get(context.id) || new Set();
        deletedImages += contextImages.size;
        storage.contextImages.delete(context.id);

        // Delete context messages
        const contextMessages = Array.from(storage.messages.values()).filter(
          (m) => m.contextId === context.id
        );
        for (const msg of contextMessages) {
          const images = Array.from(storage.images.values()).filter(
            (img) => img.messageId === msg.id
          );
          for (const img of images) {
            storage.images.delete(img.id);
          }
          storage.messages.delete(msg.id);
        }
        storage.contexts.delete(context.id);
      }

      storage.videos.delete(id);

      const response: DeleteResponse = {
        success: true,
        deleted: {
          frames: deletedFrames,
          images: deletedImages,
        },
      };

      return reply.send(response);
    }
  );
}
