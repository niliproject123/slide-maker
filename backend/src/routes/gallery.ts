import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { storage, initializeMockData } from "../services/mockStorage.js";
import type { Image } from "../types/index.js";

interface ProjectIdParams {
  projectId: string;
}

interface AddImageBody {
  imageId: string;
}

interface RemoveImageBody {
  imageId: string;
}

export async function galleryRoutes(fastify: FastifyInstance) {
  // GET /projects/:projectId/gallery - Get gallery images
  fastify.get<{ Params: ProjectIdParams }>(
    "/projects/:projectId/gallery",
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

      const galleryImageIds = storage.galleryImages.get(projectId) || new Set();
      const images = Array.from(galleryImageIds)
        .map((imgId) => storage.images.get(imgId))
        .filter((img): img is Image => img !== undefined)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((img) => ({
          id: img.id,
          url: img.url,
          createdAt: img.createdAt,
        }));

      return reply.send(images);
    }
  );

  // POST /projects/:projectId/gallery - Add image to gallery
  fastify.post<{ Params: ProjectIdParams; Body: AddImageBody }>(
    "/projects/:projectId/gallery",
    async (
      request: FastifyRequest<{ Params: ProjectIdParams; Body: AddImageBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { projectId } = request.params;
      const { imageId } = request.body;

      const project = storage.projects.get(projectId);
      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      if (!imageId) {
        return reply.status(400).send({
          error: "imageId is required",
          code: "VALIDATION_ERROR",
        });
      }

      const image = storage.images.get(imageId);
      if (!image) {
        return reply.status(404).send({
          error: "Image not found",
          code: "IMAGE_NOT_FOUND",
        });
      }

      const galleryImages = storage.galleryImages.get(projectId) || new Set();
      galleryImages.add(imageId);
      storage.galleryImages.set(projectId, galleryImages);

      return reply.status(201).send({
        success: true,
        image: {
          id: image.id,
          url: image.url,
        },
      });
    }
  );

  // DELETE /projects/:projectId/gallery/:imageId - Remove image from gallery
  fastify.delete<{ Params: ProjectIdParams & { imageId: string } }>(
    "/projects/:projectId/gallery/:imageId",
    async (
      request: FastifyRequest<{ Params: ProjectIdParams & { imageId: string } }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { projectId, imageId } = request.params;

      const project = storage.projects.get(projectId);
      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      const galleryImages = storage.galleryImages.get(projectId);
      if (galleryImages) {
        galleryImages.delete(imageId);
      }

      return reply.send({ success: true });
    }
  );

  // POST /projects/:projectId/gallery/upload - Upload image to gallery (mock)
  fastify.post<{ Params: ProjectIdParams }>(
    "/projects/:projectId/gallery/upload",
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

      // Add to gallery
      const galleryImages = storage.galleryImages.get(projectId) || new Set();
      galleryImages.add(image.id);
      storage.galleryImages.set(projectId, galleryImages);

      return reply.status(201).send(image);
    }
  );
}
