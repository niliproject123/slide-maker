# Image Generation API Specifications
## For Character Consistency with Reference Images

---

## Overview

This document provides working specifications for integrating image generation APIs that support **reference image input** (IP-Adapter, multi-reference) for maintaining character consistency across story illustrations.

---

## 1. FAL.AI - FLUX General with IP-Adapter (Recommended for Dev)

### Endpoint
```
POST https://queue.fal.run/fal-ai/flux-general/image-to-image
```

### Pricing
- ~$0.075 per megapixel (1024x1024 = 1MP)

### Authentication
```typescript
// Set environment variable
process.env.FAL_KEY = "your-api-key";

// Or configure client
import { fal } from "@fal-ai/client";
fal.config({ credentials: "YOUR_FAL_KEY" });
```

### Installation
```bash
npm install @fal-ai/client
```

### TypeScript Implementation

```typescript
import { fal } from "@fal-ai/client";

interface FluxGeneralInput {
  prompt: string;
  image_url: string;  // Base image to transform
  strength?: number;  // 0-1, how much to change (default 0.85)
  num_inference_steps?: number;  // Default 28
  guidance_scale?: number;  // Default 3.5
  num_images?: number;
  seed?: number;
  enable_safety_checker?: boolean;
  output_format?: "png" | "jpeg" | "webp";

  // IP-Adapter for character consistency
  ip_adapters?: Array<{
    ip_adapter_image_url: string;  // Reference character image
    ip_adapter_scale?: number;     // 0-1, strength of reference (default 0.6)
    ip_adapter_mask_url?: string;  // Optional mask
  }>;

  // Optional LoRA for style
  loras?: Array<{
    path: string;
    scale?: number;
  }>;
}

interface FluxGeneralOutput {
  images: Array<{
    url: string;
    content_type: string;
    width: number;
    height: number;
  }>;
  seed: number;
  has_nsfw_concepts: boolean[];
}

async function generateWithCharacterReference(
  prompt: string,
  characterReferenceUrl: string,
  options?: Partial<FluxGeneralInput>
): Promise<FluxGeneralOutput> {
  const result = await fal.subscribe("fal-ai/flux-general/image-to-image", {
    input: {
      prompt,
      image_url: characterReferenceUrl,  // Starting image
      strength: 0.75,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      ip_adapters: [
        {
          ip_adapter_image_url: characterReferenceUrl,
          ip_adapter_scale: 0.7,  // Higher = more consistent
        }
      ],
      enable_safety_checker: true,
      output_format: "png",
      ...options
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        console.log("Generating...", update.logs);
      }
    },
  });

  return result.data as FluxGeneralOutput;
}

// Usage example
async function generateStoryScene() {
  // First, create/upload your character reference image
  const characterRef = "https://your-storage.com/character-ref.png";

  const scene1 = await generateWithCharacterReference(
    "A young woman with red hair standing in a medieval marketplace, looking at fruit stalls",
    characterRef,
    { seed: 12345 }  // Use same seed for more consistency
  );

  const scene2 = await generateWithCharacterReference(
    "The same young woman with red hair sitting in a tavern, drinking from a wooden mug",
    characterRef,
    { seed: 12345 }
  );

  return [scene1, scene2];
}
```

---

## 2. FAL.AI - FLUX.2 Pro (Best Quality + Multi-Reference)

### Endpoint
```
POST https://queue.fal.run/fal-ai/flux-2-pro/edit
```

### Pricing
- $0.03 for first megapixel + $0.015 per extra MP of input/output
- Example: 1024x1024 = $0.03, 1920x1080 = $0.045

### Key Feature
Supports **up to 9 reference images** simultaneously for complex scene composition.

### TypeScript Implementation

```typescript
import { fal } from "@fal-ai/client";

interface Flux2ProEditInput {
  prompt: string;

  // Up to 9 reference images
  image_urls: string[];

  // Output settings
  image_size?: {
    width: number;
    height: number;
  } | "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9";

  seed?: number;
  output_format?: "png" | "jpeg" | "webp";
  safety_tolerance?: "1" | "2" | "3" | "4" | "5" | "6";
}

interface Flux2ProOutput {
  images: Array<{
    url: string;
    content_type: string;
  }>;
}

async function generateWithMultipleReferences(
  prompt: string,
  referenceImages: string[],  // Up to 9 URLs
  options?: Partial<Flux2ProEditInput>
): Promise<Flux2ProOutput> {

  if (referenceImages.length > 9) {
    throw new Error("FLUX.2 Pro supports maximum 9 reference images");
  }

  const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
    input: {
      prompt,
      image_urls: referenceImages,
      image_size: "square_hd",
      output_format: "png",
      ...options
    },
    logs: true,
  });

  return result.data as Flux2ProOutput;
}

// Usage: Reference specific images by number in prompt
async function generateComplexScene() {
  const character = "https://storage.com/main-character.png";
  const outfit = "https://storage.com/armor-outfit.png";
  const background = "https://storage.com/castle-bg.png";

  const result = await generateWithMultipleReferences(
    "The person from image 1 wearing the armor from image 2, standing in front of the castle from image 3, dramatic lighting",
    [character, outfit, background]
  );

  return result;
}
```

---

## 3. FAL.AI - FLUX.2 Dev Turbo (Cheapest + Fastest)

### Endpoint
```
POST https://queue.fal.run/fal-ai/flux-2-dev-turbo
```

### Pricing
- ~$0.008 per image (extremely cheap)
- 6-8 seconds generation time

### Note
Non-commercial license unless using fal.ai's commercial API endpoint.

### TypeScript Implementation

```typescript
import { fal } from "@fal-ai/client";

interface FluxTurboInput {
  prompt: string;
  image_url?: string;  // Optional reference
  image_size?: "square_hd" | "square" | "portrait_4_3" | "landscape_16_9";
  num_inference_steps?: number;  // Default 8 (optimized)
  seed?: number;
  guidance_scale?: number;
  num_images?: number;
  enable_safety_checker?: boolean;
  output_format?: "png" | "jpeg" | "webp";
}

async function generateFast(
  prompt: string,
  referenceUrl?: string,
  options?: Partial<FluxTurboInput>
): Promise<{ images: Array<{ url: string }> }> {
  const result = await fal.subscribe("fal-ai/flux-2-dev-turbo", {
    input: {
      prompt,
      image_url: referenceUrl,
      num_inference_steps: 8,
      image_size: "square_hd",
      enable_safety_checker: true,
      ...options
    },
  });

  return result.data;
}

// Batch generation for story
async function generateStoryboard(
  scenes: string[],
  characterRef: string
): Promise<string[]> {
  const results = await Promise.all(
    scenes.map(prompt => generateFast(prompt, characterRef))
  );

  return results.map(r => r.images[0].url);
}
```

---

## 4. Replicate - FLUX with IP-Adapter

### Endpoint
```
POST https://api.replicate.com/v1/predictions
```

### Pricing
- FLUX Schnell: $0.003/image
- FLUX Dev: $0.03/image
- FLUX 1.1 Pro: $0.04/image

### Installation
```bash
npm install replicate
```

### TypeScript Implementation

```typescript
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface ReplicateFluxInput {
  prompt: string;
  image?: string;  // Reference image URL or base64
  num_outputs?: number;
  aspect_ratio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  output_format?: "webp" | "png" | "jpg";
  output_quality?: number;
  num_inference_steps?: number;
  guidance?: number;
  seed?: number;

  // IP-Adapter specific (when using flux-ip-adapter model)
  ip_adapter_image?: string;
  ip_adapter_scale?: number;
}

// Using FLUX Dev with built-in image reference
async function generateWithFluxDev(
  prompt: string,
  referenceImageUrl?: string
): Promise<string[]> {
  const output = await replicate.run(
    "black-forest-labs/flux-dev",
    {
      input: {
        prompt,
        image: referenceImageUrl,  // Acts as style/content reference
        num_outputs: 1,
        aspect_ratio: "1:1",
        output_format: "png",
        num_inference_steps: 28,
        guidance: 3.5,
      }
    }
  );

  return output as string[];
}

// Using dedicated IP-Adapter model for better consistency
async function generateWithIPAdapter(
  prompt: string,
  characterReference: string,
  ipAdapterScale: number = 0.6
): Promise<string[]> {
  const output = await replicate.run(
    "lucataco/flux-dev-lora",  // or xlabs-ai/flux-ip-adapter
    {
      input: {
        prompt,
        image: characterReference,
        ip_adapter_scale: ipAdapterScale,
        num_outputs: 1,
        output_format: "png",
      }
    }
  );

  return output as string[];
}

// Async prediction with webhook (for production)
async function generateAsync(
  prompt: string,
  webhookUrl: string
): Promise<{ id: string }> {
  const prediction = await replicate.predictions.create({
    version: "black-forest-labs/flux-dev",
    input: {
      prompt,
      num_outputs: 1,
    },
    webhook: webhookUrl,
    webhook_events_filter: ["completed"],
  });

  return { id: prediction.id };
}

// Poll for result
async function waitForResult(predictionId: string): Promise<string[]> {
  let prediction = await replicate.predictions.get(predictionId);

  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    prediction = await replicate.predictions.get(predictionId);
  }

  if (prediction.status === "failed") {
    throw new Error(prediction.error);
  }

  return prediction.output as string[];
}
```

---

## 5. Complete Story Generator Service

### Full Implementation

```typescript
import { fal } from "@fal-ai/client";

// Types
interface Character {
  id: string;
  name: string;
  referenceImageUrl: string;
  description: string;
}

interface Scene {
  id: string;
  description: string;
  characters: string[];  // Character IDs
  setting: string;
}

interface GeneratedScene {
  sceneId: string;
  imageUrl: string;
  prompt: string;
}

// Configuration
const CONFIG = {
  provider: "fal" as const,  // "fal" | "replicate"
  model: "flux-2-pro" as const,  // "flux-general" | "flux-2-pro" | "flux-2-turbo"
  defaultSeed: 42,
  ipAdapterScale: 0.7,
};

// Character store (in production, use database)
const characterStore = new Map<string, Character>();

// Service class
class StoryImageGenerator {
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? CONFIG.defaultSeed;
  }

  // Register a character with reference image
  async registerCharacter(
    id: string,
    name: string,
    referenceImageUrl: string,
    description: string
  ): Promise<Character> {
    const character: Character = {
      id,
      name,
      referenceImageUrl,
      description,
    };
    characterStore.set(id, character);
    return character;
  }

  // Generate scene with character consistency
  async generateScene(scene: Scene): Promise<GeneratedScene> {
    // Build prompt with character descriptions
    const characters = scene.characters
      .map(id => characterStore.get(id))
      .filter((c): c is Character => c !== undefined);

    const characterDescriptions = characters
      .map((c, i) => `${c.name} (person ${i + 1}): ${c.description}`)
      .join("; ");

    const referenceImages = characters.map(c => c.referenceImageUrl);

    const fullPrompt = `${scene.description}. Characters: ${characterDescriptions}. Setting: ${scene.setting}. High quality, detailed illustration.`;

    // Generate based on model choice
    let imageUrl: string;

    if (CONFIG.model === "flux-2-pro" && referenceImages.length > 0) {
      // Use FLUX.2 Pro for multi-reference
      const result = await fal.subscribe("fal-ai/flux-2-pro/edit", {
        input: {
          prompt: fullPrompt,
          image_urls: referenceImages.slice(0, 9),  // Max 9
          image_size: "landscape_16_9",
          seed: this.seed,
        },
      });
      imageUrl = (result.data as any).images[0].url;

    } else if (CONFIG.model === "flux-general" && referenceImages.length > 0) {
      // Use FLUX General with IP-Adapter
      const result = await fal.subscribe("fal-ai/flux-general/image-to-image", {
        input: {
          prompt: fullPrompt,
          image_url: referenceImages[0],
          strength: 0.75,
          ip_adapters: referenceImages.map(url => ({
            ip_adapter_image_url: url,
            ip_adapter_scale: CONFIG.ipAdapterScale,
          })),
          seed: this.seed,
        },
      });
      imageUrl = (result.data as any).images[0].url;

    } else {
      // Use FLUX.2 Turbo for fast/cheap generation
      const result = await fal.subscribe("fal-ai/flux-2-dev-turbo", {
        input: {
          prompt: fullPrompt,
          image_url: referenceImages[0],
          image_size: "landscape_16_9",
          seed: this.seed,
        },
      });
      imageUrl = (result.data as any).images[0].url;
    }

    return {
      sceneId: scene.id,
      imageUrl,
      prompt: fullPrompt,
    };
  }

  // Generate entire storyboard
  async generateStoryboard(scenes: Scene[]): Promise<GeneratedScene[]> {
    const results: GeneratedScene[] = [];

    for (const scene of scenes) {
      const generated = await this.generateScene(scene);
      results.push(generated);

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }
}

// Usage example
async function main() {
  const generator = new StoryImageGenerator(12345);

  // Register characters
  await generator.registerCharacter(
    "hero",
    "Elena",
    "https://storage.example.com/elena-reference.png",
    "young woman with long red hair, green eyes, wearing a brown leather jacket"
  );

  await generator.registerCharacter(
    "sidekick",
    "Marcus",
    "https://storage.example.com/marcus-reference.png",
    "tall man with short black hair, beard, wearing blue robes"
  );

  // Define scenes
  const scenes: Scene[] = [
    {
      id: "scene-1",
      description: "Elena and Marcus meet for the first time at a crowded marketplace",
      characters: ["hero", "sidekick"],
      setting: "medieval fantasy marketplace with colorful stalls and busy crowds",
    },
    {
      id: "scene-2",
      description: "Elena discovers an ancient map while Marcus watches over her shoulder",
      characters: ["hero", "sidekick"],
      setting: "dimly lit tavern with wooden tables and candlelight",
    },
    {
      id: "scene-3",
      description: "Elena standing alone on a cliff, looking at distant mountains",
      characters: ["hero"],
      setting: "dramatic cliff edge at sunset, vast mountain range in background",
    },
  ];

  // Generate storyboard
  const storyboard = await generator.generateStoryboard(scenes);

  console.log("Generated storyboard:");
  storyboard.forEach(scene => {
    console.log(`Scene ${scene.sceneId}: ${scene.imageUrl}`);
  });
}
```

---

## 6. Environment Setup

### Required Environment Variables

```bash
# .env file

# FAL.AI
FAL_KEY=your_fal_api_key

# Replicate
REPLICATE_API_TOKEN=your_replicate_token

# Optional: For storing reference images
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
```

### Package.json Dependencies

```json
{
  "dependencies": {
    "@fal-ai/client": "^0.15.0",
    "replicate": "^0.32.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

---

## 7. Tips for Better Character Consistency

1. **Use high-quality reference images**: Clean, well-lit photos/illustrations of your character
2. **Consistent seed**: Use the same seed across related scenes
3. **Detailed character descriptions**: Include distinctive features in every prompt
4. **IP-Adapter scale**: 0.6-0.8 works best (too high = copies reference exactly)
5. **Multiple angles**: Create reference images from different angles if possible
6. **Batch generation**: Generate variations and pick the best
7. **Post-processing**: Consider face-swap tools as final consistency pass

---

## 8. Cost Comparison Summary

| Provider/Model | Price/Image | Speed | Consistency | Best For |
|---------------|-------------|-------|-------------|----------|
| FAL FLUX.2 Turbo | $0.008 | 6s | Good | Prototyping, high volume |
| FAL FLUX General | $0.075/MP | 15s | Very Good | Dev work, single character |
| FAL FLUX.2 Pro | $0.03-0.045 | 10s | Excellent | Production, multi-character |
| Replicate Schnell | $0.003 | 3s | Fair | Quick iterations |
| Replicate Dev | $0.03 | 12s | Good | Balanced quality/cost |
| Replicate Pro | $0.04 | 8s | Very Good | Production quality |

---

## 9. Error Handling

```typescript
async function safeGenerate(
  generateFn: () => Promise<any>,
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await generateFn();
    } catch (error) {
      lastError = error as Error;

      // Check for rate limiting
      if (lastError.message.includes("rate limit")) {
        const backoff = Math.pow(2, i) * 1000;
        console.log(`Rate limited, waiting ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      // Check for NSFW content block
      if (lastError.message.includes("safety") || lastError.message.includes("nsfw")) {
        throw new Error("Content blocked by safety filter. Modify prompt.");
      }

      // Unknown error, retry with backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw lastError || new Error("Generation failed after retries");
}
```
