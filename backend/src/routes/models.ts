import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  getAvailableProviders,
  getDefaultProviderId,
  PROVIDER_REGISTRY,
} from "../services/imageGeneration/index.js";

interface ModelResponse {
  id: string;
  name: string;
  provider: string;
  cost: string;
  speed: string;
  supportsImageReference: boolean;
  maxReferenceImages: number;
}

interface ModelsListResponse {
  models: ModelResponse[];
  default: string;
}

export async function modelsRoutes(fastify: FastifyInstance) {
  // GET /models - List available image generation models
  fastify.get(
    "/models",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const available = getAvailableProviders();
      const defaultId = getDefaultProviderId();

      const models: ModelResponse[] = available.map((p) => ({
        id: p.id,
        name: p.name,
        provider: p.provider,
        cost: p.cost,
        speed: p.speed,
        supportsImageReference: p.capabilities.supportsImageReference,
        maxReferenceImages: p.capabilities.maxReferenceImages,
      }));

      // If no providers are configured, return all providers as unavailable info
      if (models.length === 0) {
        const allModels = Object.values(PROVIDER_REGISTRY).map((p) => ({
          id: p.id,
          name: p.name,
          provider: p.provider,
          cost: p.cost,
          speed: p.speed,
          supportsImageReference: p.capabilities.supportsImageReference,
          maxReferenceImages: p.capabilities.maxReferenceImages,
        }));

        return reply.send({
          models: [],
          allModels, // For display purposes, show what could be available
          default: null,
          message: "No image generation providers configured. Set FAL_KEY or OPENAI_API_KEY.",
        });
      }

      const response: ModelsListResponse = {
        models,
        default: defaultId,
      };

      return reply.send(response);
    }
  );

  // GET /models/:modelId - Get specific model info
  fastify.get<{ Params: { modelId: string } }>(
    "/models/:modelId",
    async (request: FastifyRequest<{ Params: { modelId: string } }>, reply: FastifyReply) => {
      const { modelId } = request.params;

      const entry = PROVIDER_REGISTRY[modelId];
      if (!entry) {
        return reply.status(404).send({
          error: "Model not found",
          code: "NOT_FOUND",
        });
      }

      const isConfigured = !!process.env[entry.envKey];

      return reply.send({
        id: entry.id,
        name: entry.name,
        provider: entry.provider,
        cost: entry.cost,
        speed: entry.speed,
        supportsImageReference: entry.capabilities.supportsImageReference,
        maxReferenceImages: entry.capabilities.maxReferenceImages,
        maxOutputImages: entry.capabilities.maxOutputImages,
        supportedSizes: entry.capabilities.supportedSizes,
        configured: isConfigured,
        envKey: entry.envKey,
      });
    }
  );
}
