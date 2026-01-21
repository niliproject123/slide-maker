import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { v4 as uuidv4 } from "uuid";
import {
  storage,
  initializeMockData,
  createCharacterInternal,
  getCharacterImageCount,
} from "../services/mockStorage.js";
import type { Character, CharacterWithImages, Image } from "../types/index.js";

interface ProjectIdParams {
  projectId: string;
}

interface CharacterIdParams {
  characterId: string;
}

interface ImageIdParams {
  characterId: string;
  imageId: string;
}

interface CreateCharacterBody {
  name: string;
  description?: string;
}

interface UpdateCharacterBody {
  name?: string;
  description?: string;
}

interface AddImageBody {
  imageId?: string;      // Copy existing image
  imageUrl?: string;     // Or provide URL directly
}

export async function characterRoutes(fastify: FastifyInstance) {
  // GET /projects/:projectId/characters - List all characters for a project
  fastify.get<{ Params: ProjectIdParams }>(
    "/projects/:projectId/characters",
    async (
      request: FastifyRequest<{ Params: ProjectIdParams }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { projectId } = request.params;

      const project = storage.projects.get(projectId);
      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      const characters = Array.from(storage.characters.values())
        .filter((c) => c.projectId === projectId)
        .map((character) => {
          const imageIds = storage.characterImages.get(character.id) || new Set();
          const referenceImages = Array.from(imageIds)
            .map((id) => storage.images.get(id))
            .filter((img): img is Image => img !== undefined);

          return {
            ...character,
            referenceImages,
          } as CharacterWithImages;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return reply.send(characters);
    }
  );

  // POST /projects/:projectId/characters - Create a new character
  fastify.post<{ Params: ProjectIdParams; Body: CreateCharacterBody }>(
    "/projects/:projectId/characters",
    async (
      request: FastifyRequest<{ Params: ProjectIdParams; Body: CreateCharacterBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { projectId } = request.params;
      const { name, description = "" } = request.body;

      const project = storage.projects.get(projectId);
      if (!project) {
        return reply.status(404).send({
          error: "Project not found",
          code: "NOT_FOUND",
        });
      }

      if (!name || typeof name !== "string" || name.trim() === "") {
        return reply.status(400).send({
          error: "Character name is required",
          code: "VALIDATION_ERROR",
        });
      }

      const character = createCharacterInternal(projectId, name.trim(), description.trim());

      const response: CharacterWithImages = {
        ...character,
        referenceImages: [],
      };

      return reply.status(201).send(response);
    }
  );

  // GET /characters/:characterId - Get character details
  fastify.get<{ Params: CharacterIdParams }>(
    "/characters/:characterId",
    async (
      request: FastifyRequest<{ Params: CharacterIdParams }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { characterId } = request.params;

      const character = storage.characters.get(characterId);
      if (!character) {
        return reply.status(404).send({
          error: "Character not found",
          code: "NOT_FOUND",
        });
      }

      const imageIds = storage.characterImages.get(characterId) || new Set();
      const referenceImages = Array.from(imageIds)
        .map((id) => storage.images.get(id))
        .filter((img): img is Image => img !== undefined);

      const response: CharacterWithImages = {
        ...character,
        referenceImages,
      };

      return reply.send(response);
    }
  );

  // PATCH /characters/:characterId - Update character
  fastify.patch<{ Params: CharacterIdParams; Body: UpdateCharacterBody }>(
    "/characters/:characterId",
    async (
      request: FastifyRequest<{ Params: CharacterIdParams; Body: UpdateCharacterBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { characterId } = request.params;
      const { name, description } = request.body;

      const character = storage.characters.get(characterId);
      if (!character) {
        return reply.status(404).send({
          error: "Character not found",
          code: "NOT_FOUND",
        });
      }

      if (name !== undefined) {
        if (typeof name !== "string" || name.trim() === "") {
          return reply.status(400).send({
            error: "Character name cannot be empty",
            code: "VALIDATION_ERROR",
          });
        }
        character.name = name.trim();
      }

      if (description !== undefined) {
        character.description = description.trim();
      }

      character.updatedAt = new Date();
      storage.characters.set(characterId, character);

      const imageIds = storage.characterImages.get(characterId) || new Set();
      const referenceImages = Array.from(imageIds)
        .map((id) => storage.images.get(id))
        .filter((img): img is Image => img !== undefined);

      const response: CharacterWithImages = {
        ...character,
        referenceImages,
      };

      return reply.send(response);
    }
  );

  // DELETE /characters/:characterId - Delete character
  fastify.delete<{ Params: CharacterIdParams }>(
    "/characters/:characterId",
    async (
      request: FastifyRequest<{ Params: CharacterIdParams }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { characterId } = request.params;

      const character = storage.characters.get(characterId);
      if (!character) {
        return reply.status(404).send({
          error: "Character not found",
          code: "NOT_FOUND",
        });
      }

      // Delete character
      storage.characters.delete(characterId);

      // Note: We don't delete the images themselves, just the association
      storage.characterImages.delete(characterId);

      return reply.send({
        success: true,
        deleted: {
          characterId,
        },
      });
    }
  );

  // POST /characters/:characterId/images - Add reference image to character
  fastify.post<{ Params: CharacterIdParams; Body: AddImageBody }>(
    "/characters/:characterId/images",
    async (
      request: FastifyRequest<{ Params: CharacterIdParams; Body: AddImageBody }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { characterId } = request.params;
      const { imageId, imageUrl } = request.body;

      const character = storage.characters.get(characterId);
      if (!character) {
        return reply.status(404).send({
          error: "Character not found",
          code: "NOT_FOUND",
        });
      }

      let image: Image;

      if (imageId) {
        // Copy existing image
        const existingImage = storage.images.get(imageId);
        if (!existingImage) {
          return reply.status(404).send({
            error: "Image not found",
            code: "NOT_FOUND",
          });
        }

        // Create a copy of the image for the character
        image = {
          id: uuidv4(),
          url: existingImage.url,
          cloudinaryId: existingImage.cloudinaryId,
          messageId: null,
          createdAt: new Date(),
        };
        storage.images.set(image.id, image);
      } else if (imageUrl) {
        // Create new image from URL
        image = {
          id: uuidv4(),
          url: imageUrl,
          cloudinaryId: `character-${Date.now()}`,
          messageId: null,
          createdAt: new Date(),
        };
        storage.images.set(image.id, image);
      } else {
        return reply.status(400).send({
          error: "Either imageId or imageUrl is required",
          code: "VALIDATION_ERROR",
        });
      }

      // Add to character's images
      const characterImages = storage.characterImages.get(characterId) || new Set();
      characterImages.add(image.id);
      storage.characterImages.set(characterId, characterImages);

      // Update character timestamp
      character.updatedAt = new Date();
      storage.characters.set(characterId, character);

      return reply.status(201).send(image);
    }
  );

  // DELETE /characters/:characterId/images/:imageId - Remove reference image from character
  fastify.delete<{ Params: ImageIdParams }>(
    "/characters/:characterId/images/:imageId",
    async (
      request: FastifyRequest<{ Params: ImageIdParams }>,
      reply: FastifyReply
    ) => {
      initializeMockData();

      const { characterId, imageId } = request.params;

      const character = storage.characters.get(characterId);
      if (!character) {
        return reply.status(404).send({
          error: "Character not found",
          code: "NOT_FOUND",
        });
      }

      const characterImages = storage.characterImages.get(characterId);
      if (!characterImages || !characterImages.has(imageId)) {
        return reply.status(404).send({
          error: "Image not found in character",
          code: "NOT_FOUND",
        });
      }

      // Remove from character's images
      characterImages.delete(imageId);
      storage.characterImages.set(characterId, characterImages);

      // Update character timestamp
      character.updatedAt = new Date();
      storage.characters.set(characterId, character);

      return reply.send({
        success: true,
        deleted: {
          imageId,
        },
      });
    }
  );
}
