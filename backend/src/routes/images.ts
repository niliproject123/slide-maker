import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { storage, initializeMockData } from "../services/mockStorage.js";

interface ImageIdParams {
  id: string;
}

interface ProjectIdParams {
  projectId: string;
}

type TargetType = "frame" | "context" | "gallery";

interface CopyBody {
  targetType: TargetType;
  targetId: string;
}

interface MoveBody {
  sourceType: TargetType;
  sourceId: string;
  targetType: TargetType;
  targetId: string;
}

interface RemoveBody {
  sourceType: TargetType;
  sourceId: string;
}

// Helper to add image to target
function addImageToTarget(imageId: string, targetType: TargetType, targetId: string): boolean {
  switch (targetType) {
    case "frame": {
      const frame = storage.frames.get(targetId);
      if (!frame) return false;
      const frameImages = storage.frameImages.get(targetId) || new Set();
      frameImages.add(imageId);
      storage.frameImages.set(targetId, frameImages);
      return true;
    }
    case "context": {
      const context = storage.contexts.get(targetId);
      if (!context) return false;
      const contextImages = storage.contextImages.get(targetId) || new Set();
      contextImages.add(imageId);
      storage.contextImages.set(targetId, contextImages);
      return true;
    }
    case "gallery": {
      const project = storage.projects.get(targetId);
      if (!project) return false;
      const galleryImages = storage.galleryImages.get(targetId) || new Set();
      galleryImages.add(imageId);
      storage.galleryImages.set(targetId, galleryImages);
      return true;
    }
  }
}

// Helper to remove image from source
function removeImageFromSource(imageId: string, sourceType: TargetType, sourceId: string): boolean {
  switch (sourceType) {
    case "frame": {
      const frameImages = storage.frameImages.get(sourceId);
      if (frameImages) {
        frameImages.delete(imageId);
        // If this was the selected image, unselect it
        const frame = storage.frames.get(sourceId);
        if (frame && frame.selectedImageId === imageId) {
          frame.selectedImageId = null;
        }
        return true;
      }
      return false;
    }
    case "context": {
      const contextImages = storage.contextImages.get(sourceId);
      if (contextImages) {
        contextImages.delete(imageId);
        return true;
      }
      return false;
    }
    case "gallery": {
      const galleryImages = storage.galleryImages.get(sourceId);
      if (galleryImages) {
        galleryImages.delete(imageId);
        return true;
      }
      return false;
    }
  }
}

export async function imageRoutes(fastify: FastifyInstance) {
  // GET /projects/:projectId/images - Get all images in project grouped by video/frame
  fastify.get<{ Params: ProjectIdParams }>(
    "/projects/:projectId/images",
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
        .map((video) => {
          const frames = Array.from(storage.frames.values())
            .filter((f) => f.videoId === video.id)
            .sort((a, b) => a.order - b.order)
            .map((frame) => {
              const frameImageIds = storage.frameImages.get(frame.id) || new Set();
              const images = Array.from(frameImageIds)
                .map((imgId) => {
                  const img = storage.images.get(imgId);
                  if (!img) return null;
                  return {
                    id: img.id,
                    url: img.url,
                    isSelected: frame.selectedImageId === img.id,
                  };
                })
                .filter((img) => img !== null);

              return {
                id: frame.id,
                title: frame.title,
                images,
              };
            });

          const context = Array.from(storage.contexts.values()).find(
            (c) => c.videoId === video.id
          );
          const contextImageIds = context
            ? storage.contextImages.get(context.id) || new Set()
            : new Set<string>();
          const contextImages = Array.from(contextImageIds)
            .map((imgId) => {
              const img = storage.images.get(imgId);
              if (!img) return null;
              return {
                id: img.id,
                url: img.url,
              };
            })
            .filter((img) => img !== null);

          return {
            id: video.id,
            name: video.name,
            frames,
            contextImages,
          };
        });

      let totalCount = 0;
      for (const video of videos) {
        for (const frame of video.frames) {
          totalCount += frame.images.length;
        }
        totalCount += video.contextImages.length;
      }

      return reply.send({
        videos,
        totalCount,
      });
    }
  );

  // DELETE /images/:id - Delete image completely
  fastify.delete<{ Params: ImageIdParams }>(
    "/images/:id",
    async (request: FastifyRequest<{ Params: ImageIdParams }>, reply: FastifyReply) => {
      initializeMockData();

      const { id } = request.params;
      const image = storage.images.get(id);

      if (!image) {
        return reply.status(404).send({
          error: "Image not found",
          code: "NOT_FOUND",
        });
      }

      // Remove from all relations
      for (const frameImages of storage.frameImages.values()) {
        frameImages.delete(id);
      }
      for (const contextImages of storage.contextImages.values()) {
        contextImages.delete(id);
      }
      for (const galleryImages of storage.galleryImages.values()) {
        galleryImages.delete(id);
      }

      // Unselect from any frames
      for (const frame of storage.frames.values()) {
        if (frame.selectedImageId === id) {
          frame.selectedImageId = null;
        }
      }

      storage.images.delete(id);

      return reply.send({ success: true });
    }
  );

  // POST /images/:id/copy - Copy image to another location
  fastify.post<{ Params: ImageIdParams; Body: CopyBody }>(
    "/images/:id/copy",
    async (
      request: FastifyRequest<{ Params: ImageIdParams; Body: CopyBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { targetType, targetId } = request.body;

      const image = storage.images.get(id);
      if (!image) {
        return reply.status(404).send({
          error: "Image not found",
          code: "NOT_FOUND",
        });
      }

      if (!targetType || !targetId) {
        return reply.status(400).send({
          error: "targetType and targetId are required",
          code: "VALIDATION_ERROR",
        });
      }

      const success = addImageToTarget(id, targetType, targetId);
      if (!success) {
        return reply.status(404).send({
          error: `Target ${targetType} not found`,
          code: "TARGET_NOT_FOUND",
        });
      }

      return reply.send({
        success: true,
        image: {
          id: image.id,
          url: image.url,
        },
      });
    }
  );

  // POST /images/:id/move - Move image to another location
  fastify.post<{ Params: ImageIdParams; Body: MoveBody }>(
    "/images/:id/move",
    async (
      request: FastifyRequest<{ Params: ImageIdParams; Body: MoveBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { sourceType, sourceId, targetType, targetId } = request.body;

      const image = storage.images.get(id);
      if (!image) {
        return reply.status(404).send({
          error: "Image not found",
          code: "NOT_FOUND",
        });
      }

      if (!sourceType || !sourceId || !targetType || !targetId) {
        return reply.status(400).send({
          error: "sourceType, sourceId, targetType, and targetId are required",
          code: "VALIDATION_ERROR",
        });
      }

      // Remove from source
      removeImageFromSource(id, sourceType, sourceId);

      // Add to target
      const success = addImageToTarget(id, targetType, targetId);
      if (!success) {
        // Rollback - add back to source
        addImageToTarget(id, sourceType, sourceId);
        return reply.status(404).send({
          error: `Target ${targetType} not found`,
          code: "TARGET_NOT_FOUND",
        });
      }

      return reply.send({
        success: true,
        image: {
          id: image.id,
          url: image.url,
        },
      });
    }
  );

  // POST /images/:id/remove - Remove image from a specific relation (doesn't delete the image)
  fastify.post<{ Params: ImageIdParams; Body: RemoveBody }>(
    "/images/:id/remove",
    async (
      request: FastifyRequest<{ Params: ImageIdParams; Body: RemoveBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { id } = request.params;
      const { sourceType, sourceId } = request.body;

      const image = storage.images.get(id);
      if (!image) {
        return reply.status(404).send({
          error: "Image not found",
          code: "NOT_FOUND",
        });
      }

      if (!sourceType || !sourceId) {
        return reply.status(400).send({
          error: "sourceType and sourceId are required",
          code: "VALIDATION_ERROR",
        });
      }

      removeImageFromSource(id, sourceType, sourceId);

      return reply.send({ success: true });
    }
  );
}
