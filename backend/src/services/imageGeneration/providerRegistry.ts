/**
 * Provider Registry
 *
 * Central registry of all available image generation providers.
 * Providers are lazily instantiated when needed.
 */

import type {
  ProviderRegistryEntry,
  ImageGenerationProvider,
  ProviderInfo,
} from './types.js';

// Import provider factories
import { createOpenAIProvider } from './providers/openai.js';
import { createFalFluxTurboProvider, createFalFluxProProvider } from './providers/fal.js';

/**
 * Registry of all available providers
 */
export const PROVIDER_REGISTRY: Record<string, ProviderRegistryEntry> = {
  'openai-dalle3': {
    id: 'openai-dalle3',
    name: 'DALL-E 3',
    provider: 'openai',
    cost: '$0.04/image',
    speed: 'medium',
    capabilities: {
      supportsImageReference: false,
      maxReferenceImages: 0,
      maxOutputImages: 1,
      supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
    },
    envKey: 'OPENAI_API_KEY',
    factory: createOpenAIProvider,
  },

  'fal-flux-turbo': {
    id: 'fal-flux-turbo',
    name: 'FLUX.2 Turbo (Fast & Cheap)',
    provider: 'fal',
    cost: '$0.008/image',
    speed: 'fast',
    capabilities: {
      supportsImageReference: true,
      maxReferenceImages: 1,
      maxOutputImages: 4,
      supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
    },
    envKey: 'FAL_KEY',
    factory: createFalFluxTurboProvider,
  },

  'fal-flux-pro': {
    id: 'fal-flux-pro',
    name: 'FLUX.2 Pro (Best Quality)',
    provider: 'fal',
    cost: '$0.03/image',
    speed: 'medium',
    capabilities: {
      supportsImageReference: true,
      maxReferenceImages: 9,
      maxOutputImages: 1,
      supportedSizes: ['1024x1024', '1792x1024', '1024x1792'],
    },
    envKey: 'FAL_KEY',
    factory: createFalFluxProProvider,
  },
};

// Default model to use
export const DEFAULT_MODEL = 'fal-flux-turbo';

// Cache of instantiated providers
const providerCache = new Map<string, ImageGenerationProvider>();

/**
 * Get a provider instance by ID
 */
export function getProvider(providerId: string): ImageGenerationProvider {
  const entry = PROVIDER_REGISTRY[providerId];
  if (!entry) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  // Check cache first
  let provider = providerCache.get(providerId);
  if (!provider) {
    provider = entry.factory();
    providerCache.set(providerId, provider);
  }

  return provider;
}

/**
 * Get list of all configured (available) providers
 */
export function getAvailableProviders(): ProviderInfo[] {
  const available: ProviderInfo[] = [];

  for (const [id, entry] of Object.entries(PROVIDER_REGISTRY)) {
    // Check if API key is configured
    const hasKey = !!process.env[entry.envKey];
    if (hasKey) {
      available.push({
        id: entry.id,
        name: entry.name,
        provider: entry.provider,
        cost: entry.cost,
        speed: entry.speed,
        capabilities: entry.capabilities,
        envKey: entry.envKey,
      });
    }
  }

  return available;
}

/**
 * Get the default provider ID (first available, or fallback)
 */
export function getDefaultProviderId(): string {
  // Prefer the configured default if available
  if (process.env[PROVIDER_REGISTRY[DEFAULT_MODEL]?.envKey]) {
    return DEFAULT_MODEL;
  }

  // Otherwise, return first available
  const available = getAvailableProviders();
  if (available.length > 0) {
    return available[0].id;
  }

  // Fallback to default even if not configured
  return DEFAULT_MODEL;
}

/**
 * Check if any provider is configured
 */
export function hasAnyProvider(): boolean {
  return getAvailableProviders().length > 0;
}
