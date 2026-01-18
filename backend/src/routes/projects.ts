import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  storage,
  initializeMockData,
  createProjectInternal,
  getProjectVideoCount,
  getProjectImageCount,
  getProjectGalleryCount,
  getVideoFrameCount,
  getVideoImageCount,
} from "../services/mockStorage.js";
import type { ProjectListItem, DeleteResponse, Image } from "../types/index.js";

interface CreateProjectBody {
  name: string;
}

interface UpdateProjectBody {
  name: string;
}

interface ProjectParams {
  id: string;
}

export async function projectRoutes(fastify: FastifyInstance) {
  // GET /projects - List all projects
  fastify.get("/projects", async (_request: FastifyRequest, reply: FastifyReply) => {
    initializeMockData();

    const projects: ProjectListItem[] = Array.from(storage.projects.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((project) => ({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        videoCount: getProjectVideoCount(project.id),
        imageCount: getProjectImageCount(project.id),
        galleryCount: getProjectGalleryCount(project.id),
      }));

    return reply.send(projects);
  });

  // POST /projects - Create project
  fastify.post<{ Body: CreateProjectBody }>(
    "/projects",
    async (request: FastifyRequest<{ Body: CreateProjectBody }>, reply: FastifyReply) => {
      initializeMockData();

      const { name } = request.body;
      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply.status(400).send({
          error: "Project name is required",
          code: "VALIDATION_ERROR",
        });
      }

      const project = createProjectInternal(name.trim());

      return reply.status(201).send({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        videoCount: 0,
        imageCount: 0,
        galleryCount: 0,
      });
    }
  );

  // GET /projects/:id - Get project with videos
  fastify.get<{ Params: ProjectParams }>(
    "/projects/:id",
    async (request: FastifyRequest<{ Params: ProjectParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const project = storage.projects.get(id);

      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      const videos = Array.from(storage.videos.values())
        .filter((v) => v.projectId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((video) => ({
          id: video.id,
          name: video.name,
          frameCount: getVideoFrameCount(video.id),
          imageCount: getVideoImageCount(video.id),
        }));

      const galleryImageIds = storage.galleryImages.get(id) || new Set();
      const galleryImages: Image[] = Array.from(galleryImageIds)
        .map((imgId) => storage.images.get(imgId))
        .filter((img): img is Image => img !== undefined);

      return reply.send({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        videos,
        galleryCount: galleryImages.length,
      });
    }
  );

  // PUT /projects/:id - Update project
  fastify.put<{ Params: ProjectParams; Body: UpdateProjectBody }>(
    "/projects/:id",
    async (
      request: FastifyRequest<{ Params: ProjectParams; Body: UpdateProjectBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { name } = request.body;
      const project = storage.projects.get(id);

      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply.status(400).send({
          error: "Project name is required",
          code: "VALIDATION_ERROR",
        });
      }

      project.name = name.trim();
      project.updatedAt = new Date();

      return reply.send({
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        videoCount: getProjectVideoCount(project.id),
        imageCount: getProjectImageCount(project.id),
        galleryCount: getProjectGalleryCount(project.id),
      });
    }
  );

  // DELETE /projects/:id - Delete project and all contents
  fastify.delete<{ Params: ProjectParams }>(
    "/projects/:id",
    async (request: FastifyRequest<{ Params: ProjectParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const project = storage.projects.get(id);

      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      let deletedVideos = 0;
      let deletedFrames = 0;
      let deletedImages = 0;

      // Delete all videos in project
      const videos = Array.from(storage.videos.values()).filter((v) => v.projectId === id);
      for (const video of videos) {
        // Delete frames
        const frames = Array.from(storage.frames.values()).filter(
          (f) => f.videoId === video.id
        );
        for (const frame of frames) {
          // Delete frame images relation and count
          const frameImages = storage.frameImages.get(frame.id) || new Set();
          deletedImages += frameImages.size;
          storage.frameImages.delete(frame.id);

          // Delete messages
          const messages = Array.from(storage.messages.values()).filter(
            (m) => m.frameId === frame.id
          );
          for (const msg of messages) {
            // Delete images from this message
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
          (c) => c.videoId === video.id
        );
        if (context) {
          const contextImages = storage.contextImages.get(context.id) || new Set();
          deletedImages += contextImages.size;
          storage.contextImages.delete(context.id);
          storage.contexts.delete(context.id);
        }

        storage.videos.delete(video.id);
        deletedVideos++;
      }

      // Delete gallery images relation
      const galleryImages = storage.galleryImages.get(id) || new Set();
      deletedImages += galleryImages.size;
      storage.galleryImages.delete(id);

      // Delete project
      storage.projects.delete(id);

      const response: DeleteResponse = {
        success: true,
        deleted: {
          videos: deletedVideos,
          frames: deletedFrames,
          images: deletedImages,
        },
      };

      return reply.send(response);
    }
  );
}
