/**
 * FAL.AI FLUX Providers
 *
 * Image-to-image with IP-Adapter support. Reference images are passed
 * directly to the model for better character/style consistency.
 */

import { fal } from "@fal-ai/client";
import type {
  ImageGenerationProvider,
  ProviderInfo,
  GenerateOptions,
  GenerateResult,
  GeneratedImage,
} from "../types.js";

// Configure fal client on first use
let falConfigured = false;

function configureFal(): void {
  if (!falConfigured) {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      throw new Error("FAL_KEY environment variable is not set");
    }
    fal.config({ credentials: apiKey });
    falConfigured = true;
  }
}

/**
 * Valid FAL image sizes
 */
type FalImageSize = "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";

/**
 * Convert size string to fal image_size format
 * Default to TikTok portrait (9:16 ratio)
 */
function toFalSize(size?: string): FalImageSize {
  switch (size) {
    case "1024x1024":
      return "square_hd";
    case "1792x1024":
      return "landscape_16_9";
    case "1024x1792":
      return "portrait_16_9";
    default:
      // Default to TikTok portrait (9:16)
      return "portrait_16_9";
  }
}

// ============================================
// FLUX.2 Turbo Provider (Fast & Cheap)
// ============================================

interface FluxTurboInput {
  prompt: string;
  image_url?: string;
  image_size?: FalImageSize;
  num_inference_steps?: number;
  seed?: number;
  num_images?: number;
  enable_safety_checker?: boolean;
  output_format?: "png" | "jpeg";
}

interface FluxTurboOutput {
  images: Array<{
    url: string;
    content_type: string;
  }>;
  seed: number;
}

class FalFluxTurboProvider implements ImageGenerationProvider {
  readonly info: ProviderInfo = {
    id: "fal-flux-turbo",
    name: "FLUX.2 Turbo (Fast & Cheap)",
    provider: "fal",
    cost: "$0.008/image",
    speed: "fast",
    capabilities: {
      supportsImageReference: true,
      maxReferenceImages: 1,
      maxOutputImages: 4,
      supportedSizes: ["1024x1024", "1792x1024", "1024x1792"],
    },
    envKey: "FAL_KEY",
  };

  isConfigured(): boolean {
    return !!process.env.FAL_KEY;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    configureFal();

    const {
      prompt,
      referenceImageUrls = [],
      contextText,
      imageCount = 1,
      size,
      seed,
    } = options;

    // Build enhanced prompt with context
    let enhancedPrompt = prompt;
    if (contextText && contextText.trim()) {
      enhancedPrompt = `${prompt}\n\nContext: ${contextText}`;
    }

    const input: FluxTurboInput = {
      prompt: enhancedPrompt,
      image_size: toFalSize(size),
      num_inference_steps: 8,
      num_images: Math.min(Math.max(1, imageCount), 4),
      enable_safety_checker: true,
      output_format: "png",
    };

    // Add reference image if provided (IP-Adapter style reference)
    if (referenceImageUrls.length > 0) {
      input.image_url = referenceImageUrls[0];
    }

    if (seed !== undefined) {
      input.seed = seed;
    }

    const result = await fal.subscribe("fal-ai/flux/dev", {
      input,
      logs: false,
    });

    const output = result.data as FluxTurboOutput;

    const images: GeneratedImage[] = output.images.map((img) => ({
      url: img.url,
      seed: output.seed,
    }));

    if (images.length === 0) {
      throw new Error("Failed to generate any images");
    }

    return {
      images,
      model: "flux-turbo",
      provider: "fal",
    };
  }
}

// ============================================
// FLUX.2 Pro Provider (Best Quality, Multi-Reference)
// ============================================

interface FluxProInput {
  prompt: string;
  image_url?: string;
  image_urls?: string[];
  image_size?: FalImageSize;
  seed?: number;
  output_format?: "png" | "jpeg";
  safety_tolerance?: "1" | "2" | "3" | "4" | "5" | "6";

  // IP-Adapter settings
  ip_adapter_image_url?: string;
  ip_adapter_scale?: number;
}

interface FluxProOutput {
  images: Array<{
    url: string;
    content_type: string;
  }>;
  seed?: number;
}

class FalFluxProProvider implements ImageGenerationProvider {
  readonly info: ProviderInfo = {
    id: "fal-flux-pro",
    name: "FLUX.2 Pro (Best Quality)",
    provider: "fal",
    cost: "$0.03/image",
    speed: "medium",
    capabilities: {
      supportsImageReference: true,
      maxReferenceImages: 9,
      maxOutputImages: 1,
      supportedSizes: ["1024x1024", "1792x1024", "1024x1792"],
    },
    envKey: "FAL_KEY",
  };

  isConfigured(): boolean {
    return !!process.env.FAL_KEY;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    configureFal();

    const {
      prompt,
      referenceImageUrls = [],
      contextText,
      imageCount = 1,
      size,
      seed,
      ipAdapterScale = 0.7,
    } = options;

    // Build enhanced prompt with context
    let enhancedPrompt = prompt;
    if (contextText && contextText.trim()) {
      enhancedPrompt = `${prompt}\n\nContext: ${contextText}`;
    }

    const images: GeneratedImage[] = [];
    const count = Math.min(Math.max(1, imageCount), 4);

    // FLUX Pro only generates 1 image at a time, so we loop
    for (let i = 0; i < count; i++) {
      const input: FluxProInput = {
        prompt: enhancedPrompt,
        image_size: toFalSize(size),
        output_format: "png",
        safety_tolerance: "2",
      };

      // Add reference images for IP-Adapter
      if (referenceImageUrls.length > 0) {
        if (referenceImageUrls.length === 1) {
          input.ip_adapter_image_url = referenceImageUrls[0];
          input.ip_adapter_scale = ipAdapterScale;
        } else {
          // Multiple reference images
          input.image_urls = referenceImageUrls.slice(0, 9);
        }
      }

      if (seed !== undefined) {
        input.seed = seed;
      }

      const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
        input,
        logs: false,
      });

      const output = result.data as FluxProOutput;

      if (output.images && output.images.length > 0) {
        images.push({
          url: output.images[0].url,
          seed: output.seed,
        });
      }
    }

    if (images.length === 0) {
      throw new Error("Failed to generate any images");
    }

    return {
      images,
      model: "flux-pro",
      provider: "fal",
    };
  }
}

export function createFalFluxTurboProvider(): ImageGenerationProvider {
  return new FalFluxTurboProvider();
}

export function createFalFluxProProvider(): ImageGenerationProvider {
  return new FalFluxProProvider();
}
