/**
 * Image Generation Provider Types
 *
 * Defines the interfaces for multi-provider image generation support.
 * Supports both text-to-image (DALL-E) and image-to-image with IP-Adapter (FLUX).
 */

export interface GenerateOptions {
  prompt: string;
  referenceImageUrls?: string[];    // Attached images for reference
  contextText?: string;             // Video context text
  seed?: number;                    // For reproducibility
  imageCount?: number;              // Number of images to generate (1-4)

  // Provider-specific options
  ipAdapterScale?: number;          // For FLUX: 0.0-1.0, strength of reference
  strength?: number;                // For img2img: how much to change base image
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
}

export interface GeneratedImage {
  url: string;
  revisedPrompt?: string;           // DALL-E returns revised prompt
  seed?: number;                    // Seed used for generation
}

export interface GenerateResult {
  images: GeneratedImage[];
  model: string;
  provider: string;
}

export interface ProviderCapabilities {
  supportsImageReference: boolean;  // TRUE = IP-Adapter flow (images passed directly)
  maxReferenceImages: number;       // Max images that can be passed as reference
  maxOutputImages: number;          // Max images per generation
  supportedSizes: string[];
}

export interface ProviderInfo {
  id: string;                       // e.g., "fal-flux-turbo"
  name: string;                     // e.g., "FLUX.2 Turbo (Fast)"
  provider: string;                 // e.g., "fal"
  cost: string;                     // e.g., "$0.008/image"
  speed: 'fast' | 'medium' | 'slow';
  capabilities: ProviderCapabilities;
  envKey: string;                   // Environment variable name for API key
}

export interface ImageGenerationProvider {
  readonly info: ProviderInfo;

  /**
   * Check if this provider is configured (has valid API key)
   */
  isConfigured(): boolean;

  /**
   * Generate images using this provider
   */
  generate(options: GenerateOptions): Promise<GenerateResult>;
}

/**
 * Provider registry entry - static info before instantiation
 */
export interface ProviderRegistryEntry {
  id: string;
  name: string;
  provider: string;
  cost: string;
  speed: 'fast' | 'medium' | 'slow';
  capabilities: ProviderCapabilities;
  envKey: string;
  factory: () => ImageGenerationProvider;
}
