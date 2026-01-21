/**
 * Image Generation Service
 *
 * Main entry point for image generation. Handles provider selection
 * and delegates to the appropriate provider.
 */

export type {
  GenerateOptions,
  GenerateResult,
  GeneratedImage,
  ProviderInfo,
  ImageGenerationProvider,
} from "./types.js";

export {
  PROVIDER_REGISTRY,
  DEFAULT_MODEL,
  getProvider,
  getAvailableProviders,
  getDefaultProviderId,
  hasAnyProvider,
} from "./providerRegistry.js";

import type { GenerateOptions, GenerateResult } from "./types.js";
import { getProvider, getDefaultProviderId, hasAnyProvider } from "./providerRegistry.js";

/**
 * Generate images using the specified provider (or default)
 */
export async function generateImages(
  options: GenerateOptions,
  providerId?: string
): Promise<GenerateResult> {
  if (!hasAnyProvider()) {
    throw new Error("No image generation providers are configured. Please set FAL_KEY or OPENAI_API_KEY.");
  }

  const actualProviderId = providerId || getDefaultProviderId();
  const provider = getProvider(actualProviderId);

  if (!provider.isConfigured()) {
    throw new Error(`Provider ${actualProviderId} is not configured. Missing API key.`);
  }

  return provider.generate(options);
}

/**
 * Generate mock images (for development without API keys)
 */
export function generateMockImages(count: number = 1): GenerateResult {
  const images = [];
  for (let i = 0; i < count; i++) {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}-${i}`;
    images.push({
      url: `https://picsum.photos/seed/${seed}/1792/1024`,
    });
  }

  return {
    images,
    model: "mock",
    provider: "mock",
  };
}

/**
 * Check if we should use mock generation (no providers configured)
 */
export function shouldUseMock(): boolean {
  return !hasAnyProvider();
}
