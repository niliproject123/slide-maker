# External Services - Video Frames Editor

## Overview

| Service | Purpose | Pricing |
|---------|---------|---------|
| Image Generation | AI image creation | See comparison below |
| Cloudinary | Image storage + Video creation | Free tier (25GB) |

---

## Image Generation Price Comparison

### Provider Comparison

| Provider | Model | Size | Quality | Price/Image | Notes |
|----------|-------|------|---------|-------------|-------|
| **OpenAI** | gpt-image-1.5 | 1024x1024 | Medium | ~$0.04 | Best quality, newest |
| **OpenAI** | gpt-image-1 | 1024x1024 | Low | $0.011 | Budget |
| **OpenAI** | gpt-image-1 | 1024x1024 | Medium | $0.042 | **Default** |
| **OpenAI** | gpt-image-1 | 1024x1024 | High | $0.167 | |
| **OpenAI** | gpt-image-1-mini | 1024x1024 | - | ~$0.005 | Cheapest |
| **OpenAI** | DALL-E 3 | 1024x1024 | Standard | $0.040 | ⚠️ Deprecated May 2026 |
| **OpenAI** | DALL-E 2 | 1024x1024 | - | $0.020 | ⚠️ Deprecated May 2026 |
| **Replicate** | FLUX 1.1 Pro | 1024x1024 | - | ~$0.040 | Fast |
| **Replicate** | FLUX Schnell | 1024x1024 | - | ~$0.003 | Very fast, lower quality |
| **Replicate** | SDXL | 1024x1024 | - | ~$0.002 | Open source |
| **Stability** | SD3 Large | 1024x1024 | - | $0.065 | |
| **Stability** | SD3 Medium | 1024x1024 | - | $0.035 | |

**Note:** GPT Image models return base64 (not URLs). We upload to Cloudinary for permanent URLs.

### Recommendation

**Default: `gpt-image-1` Medium** - Good balance of quality and price.

| Use Case | Recommended | Cost for 4 images |
|----------|-------------|-------------------|
| Default | gpt-image-1 Medium | $0.17 |
| Best quality | gpt-image-1.5 | ~$0.16 |
| Budget | gpt-image-1-mini | ~$0.02 |
| Video (16:9) | gpt-image-1 @ 1536x1024 | $0.17 |

---

## Image Generation - Abstraction Layer

### Interface Definition

```typescript
// src/services/image-generation/types.ts

export interface ImageGenerationOptions {
  prompt: string;
  count?: number;       // default: 4
  width?: number;       // default: 1536
  height?: number;      // default: 1024
  quality?: 'low' | 'medium' | 'high';  // default: 'medium'
}

export interface ImageGenerationResult {
  url: string;          // Cloudinary URL (permanent)
  cloudinaryId: string; // For deletion/video export
  provider: string;
  model: string;
}

export interface ImageGenerationProvider {
  name: string;
  generate(options: ImageGenerationOptions): Promise<ImageGenerationResult[]>;
}
```

### Provider Factory

```typescript
// src/services/image-generation/index.ts

import { ImageGenerationProvider, ImageGenerationOptions, ImageGenerationResult } from './types';
import { OpenAIProvider } from './providers/openai';
import { ReplicateProvider } from './providers/replicate';
import { StabilityProvider } from './providers/stability';
import { env } from '../../config/env';

export type ProviderName = 
  | 'openai-gpt-image'      // gpt-image-1 (default)
  | 'openai-gpt-image-mini' // gpt-image-1-mini (cheapest)
  | 'openai-gpt-image-1.5'  // gpt-image-1.5 (best)
  | 'openai-dalle-3'        // deprecated May 2026
  | 'replicate-flux' 
  | 'replicate-sdxl' 
  | 'stability';

const providers: Record<ProviderName, () => ImageGenerationProvider> = {
  'openai-gpt-image': () => new OpenAIProvider('gpt-image-1'),
  'openai-gpt-image-mini': () => new OpenAIProvider('gpt-image-1-mini'),
  'openai-gpt-image-1.5': () => new OpenAIProvider('gpt-image-1.5'),
  'openai-dalle-3': () => new OpenAIProvider('dall-e-3'),
  'replicate-flux': () => new ReplicateProvider('flux-1.1-pro'),
  'replicate-sdxl': () => new ReplicateProvider('sdxl'),
  'stability': () => new StabilityProvider('sd3-medium'),
};

// Default: gpt-image-1
const currentProvider: ProviderName = (env.IMAGE_PROVIDER as ProviderName) || 'openai-gpt-image';

export function getImageProvider(name?: ProviderName): ImageGenerationProvider {
  const providerName = name || currentProvider;
  const factory = providers[providerName];
  
  if (!factory) {
    throw new Error(`Unknown image provider: ${providerName}`);
  }
  
  return factory();
}

// Convenience function
export async function generateImages(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult[]> {
  const provider = getImageProvider();
  return provider.generate(options);
}

// With context helper
export async function generateImagesWithContext(
  prompt: string,
  contextText: string,
  count?: number
): Promise<ImageGenerationResult[]> {
  const fullPrompt = contextText 
    ? `${contextText}\n\n${prompt}`
    : prompt;
  
  return generateImages({ prompt: fullPrompt, count });
}
```

### OpenAI Provider

**Important:** GPT Image models (`gpt-image-1`, `gpt-image-1-mini`, `gpt-image-1.5`) return **base64** only, not URLs. We must upload to Cloudinary to get permanent URLs.

DALL-E models are deprecated (May 2026), so we use GPT Image as default.

```typescript
// src/services/image-generation/providers/openai.ts

import OpenAI from 'openai';
import { ImageGenerationProvider, ImageGenerationOptions, ImageGenerationResult } from '../types';
import { uploadBase64ToCloudinary } from '../../cloudinary';
import { env } from '../../../config/env';

type OpenAIModel = 'gpt-image-1' | 'gpt-image-1-mini' | 'gpt-image-1.5' | 'dall-e-3' | 'dall-e-2';

// GPT Image models return base64, DALL-E returns URLs
const GPT_IMAGE_MODELS = ['gpt-image-1', 'gpt-image-1-mini', 'gpt-image-1.5'];

export class OpenAIProvider implements ImageGenerationProvider {
  name = 'openai';
  private client: OpenAI;
  private model: OpenAIModel;

  constructor(model: OpenAIModel = 'gpt-image-1') {
    this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    this.model = model;
  }

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult[]> {
    const {
      prompt,
      count = 4,
      width = 1792,
      height = 1024,
      quality = 'medium',
    } = options;

    const size = this.getSize(width, height);
    const isGptImage = GPT_IMAGE_MODELS.includes(this.model);

    // GPT Image models: request base64
    if (isGptImage) {
      const response = await this.client.images.generate({
        model: this.model,
        prompt,
        size,
        quality: this.mapQualityGpt(quality),
        n: count,
        // GPT Image always returns base64, no response_format needed
      });

      // Upload each base64 image to Cloudinary
      const uploadPromises = response.data.map(async (item) => {
        const base64 = item.b64_json;
        if (!base64) throw new Error('No base64 data returned');
        
        const { url, cloudinaryId } = await uploadBase64ToCloudinary(base64);
        
        return {
          url,
          cloudinaryId,
          provider: this.name,
          model: this.model,
        };
      });

      return Promise.all(uploadPromises);
    }

    // DALL-E 3: one image at a time (deprecated May 2026)
    if (this.model === 'dall-e-3') {
      const promises = Array(count).fill(null).map(() => 
        this.client.images.generate({
          model: this.model,
          prompt,
          size,
          quality: this.mapQualityDalle(quality),
          n: 1,
          response_format: 'url',
        })
      );
      
      const responses = await Promise.all(promises);
      return responses
        .map(r => r.data[0].url)
        .filter((url): url is string => !!url)
        .map(url => ({
          url,
          provider: this.name,
          model: this.model,
        }));
    }

    // DALL-E 2: batch support (deprecated May 2026)
    const response = await this.client.images.generate({
      model: this.model,
      prompt,
      size: '1024x1024', // DALL-E 2 only supports this
      n: count,
      response_format: 'url',
    });

    return response.data
      .map(d => d.url)
      .filter((url): url is string => !!url)
      .map(url => ({
        url,
        provider: this.name,
        model: this.model,
      }));
  }

  private getSize(width: number, height: number): '1024x1024' | '1536x1024' | '1024x1536' {
    // GPT Image sizes (different from DALL-E)
    if (width > height) return '1536x1024';
    if (height > width) return '1024x1536';
    return '1024x1024';
  }

  private mapQualityGpt(quality: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
    return quality; // GPT Image uses low/medium/high directly
  }

  private mapQualityDalle(quality: 'low' | 'medium' | 'high'): 'standard' | 'hd' {
    return quality === 'high' ? 'hd' : 'standard';
  }
}
```

### Cloudinary Upload (Base64)

```typescript
// src/services/cloudinary.ts

import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Upload base64 image (for GPT Image models)
export async function uploadBase64ToCloudinary(
  base64Data: string,
  folder = 'video-frames'
): Promise<{ url: string; cloudinaryId: string }> {
  const result = await cloudinary.uploader.upload(
    `data:image/png;base64,${base64Data}`,
    {
      folder,
      resource_type: 'image',
    }
  );

  return {
    url: result.secure_url,
    cloudinaryId: result.public_id,
  };
}

// Upload from URL (for DALL-E models or external images)
export async function uploadFromUrl(
  imageUrl: string,
  folder = 'video-frames'
): Promise<{ url: string; cloudinaryId: string }> {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder,
    resource_type: 'image',
  });

  return {
    url: result.secure_url,
    cloudinaryId: result.public_id,
  };
}
```

### Replicate Provider

```typescript
// src/services/image-generation/providers/replicate.ts

import Replicate from 'replicate';
import { ImageGenerationProvider, ImageGenerationOptions, ImageGenerationResult } from '../types';
import { env } from '../../../config/env';

type ReplicateModel = 'flux-1.1-pro' | 'flux-schnell' | 'sdxl';

const MODEL_IDS: Record<ReplicateModel, string> = {
  'flux-1.1-pro': 'black-forest-labs/flux-1.1-pro',
  'flux-schnell': 'black-forest-labs/flux-schnell',
  'sdxl': 'stability-ai/sdxl:c221b2b8ef527988fb59bf24a8b97c4561f1c671f73bd389f866bfb27c061316',
};

export class ReplicateProvider implements ImageGenerationProvider {
  name = 'replicate';
  private client: Replicate;
  private model: ReplicateModel;

  constructor(model: ReplicateModel = 'flux-1.1-pro') {
    this.client = new Replicate({ auth: env.REPLICATE_API_TOKEN });
    this.model = model;
  }

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult[]> {
    const {
      prompt,
      count = 4,
      width = 1792,
      height = 1024,
    } = options;

    const modelId = MODEL_IDS[this.model];
    
    // Generate images in parallel
    const promises = Array(count).fill(null).map(() =>
      this.client.run(modelId, {
        input: {
          prompt,
          width,
          height,
          num_outputs: 1,
        },
      })
    );

    const results = await Promise.all(promises);
    
    return results
      .flat()
      .filter((url): url is string => typeof url === 'string')
      .map(url => ({
        url,
        provider: this.name,
        model: this.model,
      }));
  }
}
```

### Stability Provider

```typescript
// src/services/image-generation/providers/stability.ts

import { ImageGenerationProvider, ImageGenerationOptions, ImageGenerationResult } from '../types';
import { env } from '../../../config/env';

type StabilityModel = 'sd3-large' | 'sd3-medium' | 'sdxl-1.0';

export class StabilityProvider implements ImageGenerationProvider {
  name = 'stability';
  private model: StabilityModel;
  private apiKey: string;

  constructor(model: StabilityModel = 'sd3-medium') {
    this.model = model;
    this.apiKey = env.STABILITY_API_KEY;
  }

  async generate(options: ImageGenerationOptions): Promise<ImageGenerationResult[]> {
    const {
      prompt,
      count = 4,
      width = 1024,
      height = 1024,
    } = options;

    const promises = Array(count).fill(null).map(() => this.generateOne(prompt, width, height));
    return Promise.all(promises);
  }

  private async generateOne(
    prompt: string,
    width: number,
    height: number
  ): Promise<ImageGenerationResult> {
    const endpoint = this.getEndpoint();
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        width,
        height,
        samples: 1,
      }),
    });

    const data = await response.json();
    const base64 = data.artifacts?.[0]?.base64;
    
    if (!base64) {
      throw new Error('No image returned from Stability');
    }

    // Return base64 data URL (will be uploaded to Cloudinary)
    return {
      url: `data:image/png;base64,${base64}`,
      provider: this.name,
      model: this.model,
    };
  }

  private getEndpoint(): string {
    const base = 'https://api.stability.ai';
    switch (this.model) {
      case 'sd3-large':
      case 'sd3-medium':
        return `${base}/v2beta/stable-image/generate/sd3`;
      default:
        return `${base}/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image`;
    }
  }
}
```

### Environment Configuration

```typescript
// src/config/env.ts

export const env = {
  // Image provider selection (default: GPT-Image-1)
  IMAGE_PROVIDER: process.env.IMAGE_PROVIDER || 'openai-gpt-image',
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  
  // Replicate (optional)
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN || '',
  
  // Stability (optional)
  STABILITY_API_KEY: process.env.STABILITY_API_KEY || '',
  
  // ... other env vars
};
```

### Usage Example

```typescript
// In route handler
import { generateImages, getImageProvider } from '../services/image-generation';

// Use default provider (from env)
const images = await generateImages({
  prompt: 'sunset over mountains',
  count: 4,
  width: 1792,
  height: 1024,
  quality: 'medium',
});

// Or specify provider explicitly
const provider = getImageProvider('replicate-flux');
const images = await provider.generate({
  prompt: 'sunset over mountains',
  count: 4,
});
```

### Switching Providers

Change the environment variable:

```bash
# Use GPT-Image-1 (default, good balance)
IMAGE_PROVIDER=openai-gpt-image

# Use DALL-E 3 (best quality)
IMAGE_PROVIDER=openai

# Use FLUX (fast, good quality)
IMAGE_PROVIDER=replicate-flux

# Use SDXL (budget option)
IMAGE_PROVIDER=replicate-sdxl

# Use Stability SD3
IMAGE_PROVIDER=stability
```
```

---

## Cloudinary

### Setup

```bash
npm install cloudinary
```

### Configuration

```typescript
// src/services/cloudinary.service.ts

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
```

### Upload Image

```typescript
export interface UploadResult {
  url: string;
  publicId: string;
}

export async function uploadImage(imageUrl: string): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder: 'video-frames-editor/images',
    resource_type: 'image',
  });
  
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

// Upload from any provider URL (or base64)
export async function uploadFromUrl(sourceUrl: string): Promise<UploadResult> {
  // Works with both URLs and base64 data URIs
  return uploadImage(sourceUrl);
}
```

### Delete Image

```typescript
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export async function deleteImages(publicIds: string[]): Promise<void> {
  // Delete in batches of 100 (Cloudinary limit)
  const batches = chunk(publicIds, 100);
  
  for (const batch of batches) {
    await cloudinary.api.delete_resources(batch);
  }
}

function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

### Create Video Slideshow

```typescript
export interface SlideshowOptions {
  slideDuration?: number;      // ms per slide (default: 3000)
  transitionDuration?: number; // ms for transition (default: 1000)
  transition?: 'fade' | 'slide' | 'wipe';
  width?: number;
  height?: number;
}

export async function createSlideshow(
  imagePublicIds: string[],
  options: SlideshowOptions = {}
): Promise<string> {
  const {
    slideDuration = 3000,
    transitionDuration = 1000,
    transition = 'fade',
    width = 1920,
    height = 1080,
  } = options;

  if (imagePublicIds.length === 0) {
    throw new Error('No images provided for slideshow');
  }

  // Build manifest for slideshow
  const manifest = {
    w: width,
    h: height,
    du: imagePublicIds.length * (slideDuration / 1000),
    vars: {
      sdur: slideDuration,
      tdur: transitionDuration,
      transition: `s:${transition}`,
      slides: imagePublicIds.map((id) => ({
        media: `i:${id}`,
      })),
    },
  };

  const result = await cloudinary.uploader.create_slideshow({
    manifest_json: JSON.stringify(manifest),
    public_id: `video-frames-editor/videos/slideshow_${Date.now()}`,
    resource_type: 'video',
    overwrite: true,
  });

  return result.secure_url;
}

// Alternative: URL-based transformation (synchronous, but limited)
export function getSlideshowUrl(
  imagePublicIds: string[],
  options: SlideshowOptions = {}
): string {
  const {
    slideDuration = 3000,
    width = 1920,
    height = 1080,
  } = options;

  const slides = imagePublicIds
    .map((id) => `(media_i:${id})`)
    .join(';');

  const totalDuration = imagePublicIds.length * (slideDuration / 1000);

  return cloudinary.url('video-frames-editor/slideshow', {
    resource_type: 'video',
    transformation: [
      {
        variables: [
          ['$w', width],
          ['$h', height],
          ['$du', totalDuration],
          ['$sdur', slideDuration],
          ['$slides', slides],
        ],
      },
      { width, height, crop: 'fill' },
      { format: 'mp4' },
    ],
  });
}
```

### Full Export Flow

```typescript
// src/services/export.service.ts

import { prisma } from '../plugins/prisma';
import { createSlideshow } from './cloudinary.service';

export async function exportVideo(videoId: string): Promise<string> {
  // 1. Get all frames with selected images
  const frames = await prisma.frame.findMany({
    where: {
      videoId,
      selectedImageId: { not: null },
    },
    orderBy: { order: 'asc' },
    include: {
      selectedImage: true,
    },
  });

  if (frames.length === 0) {
    throw new Error('No frames with selected images');
  }

  // 2. Extract Cloudinary public IDs
  const imageIds = frames
    .map((f) => f.selectedImage?.cloudinaryId)
    .filter((id): id is string => id !== undefined);

  // 3. Create slideshow
  const videoUrl = await createSlideshow(imageIds, {
    slideDuration: 3000,
    transitionDuration: 1000,
    transition: 'fade',
  });

  return videoUrl;
}
```

---

## Full Image Generation Flow

```typescript
// src/routes/frames.ts - generate endpoint

import { generateImages } from '../services/image-generation';
import { uploadFromUrl } from '../services/cloudinary.service';
import { prisma } from '../plugins/prisma';

fastify.post('/:frameId/generate', async (request, reply) => {
  const { frameId } = request.params;
  const { prompt, withContext } = request.body;
  const userId = request.user.id;

  // 1. Verify frame ownership
  const frame = await prisma.frame.findUnique({
    where: { id: frameId },
    include: {
      video: {
        include: {
          project: true,
          context: {
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!frame || frame.video.project.userId !== userId) {
    return reply.status(404).send({ error: 'Frame not found' });
  }

  // 2. Build full prompt (with context if requested)
  let fullPrompt = prompt;
  if (withContext && frame.video.context?.messages[0]) {
    const contextText = frame.video.context.messages[0].prompt;
    fullPrompt = `${contextText}. ${prompt}`;
  }

  // 3. Generate images (uses provider from env)
  const generatedImages = await generateImages({ 
    prompt: fullPrompt, 
    count: 4,
    width: 1792,
    height: 1024,
  });

  // 4. Upload to Cloudinary (parallel)
  const uploadPromises = generatedImages.map((img) => uploadFromUrl(img.url));
  const uploadResults = await Promise.all(uploadPromises);

  // 5. Save to database
  const message = await prisma.message.create({
    data: {
      prompt,
      withContext,
      frameId,
      images: {
        create: uploadResults.map((result) => ({
          url: result.url,
          cloudinaryId: result.publicId,
        })),
      },
    },
    include: {
      images: true,
    },
  });

  return reply.status(201).send(message);
});
```

---

## Error Handling

```typescript
// Wrap provider errors
try {
  const images = await generateImages({ prompt });
} catch (error) {
  if (error.message?.includes('content_policy')) {
    throw new AppError(400, 'Prompt violates content policy');
  }
  if (error.message?.includes('rate_limit')) {
    throw new AppError(429, 'Rate limit exceeded, try again later');
  }
  throw new AppError(500, 'Image generation failed');
}

// Cloudinary errors
try {
  const result = await uploadImage(url);
} catch (error) {
  if (error.http_code === 401) {
    throw new AppError(500, 'Cloudinary authentication failed');
  }
  throw new AppError(500, 'Image upload failed');
}
```

---

## Environment Variables

```bash
# Image Provider (choose one)
IMAGE_PROVIDER=openai  # or: openai-gpt-image, replicate-flux, replicate-sdxl, stability

# OpenAI (required if using openai or openai-gpt-image)
OPENAI_API_KEY=sk-...

# Replicate (required if using replicate-*)
REPLICATE_API_TOKEN=r8_...

# Stability (required if using stability)
STABILITY_API_KEY=sk-...

# Cloudinary (always required)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnop
```

---

## Cost Estimation (per 4 images)

| Provider | Model | Cost/4 images | 100 generations |
|----------|-------|---------------|-----------------|
| OpenAI | DALL-E 3 (1792x1024) | $0.32 | $32 |
| OpenAI | GPT-Image-1 Medium | $0.17 | $17 |
| OpenAI | DALL-E 2 | $0.08 | $8 |
| Replicate | FLUX 1.1 Pro | $0.16 | $16 |
| Replicate | FLUX Schnell | $0.012 | $1.20 |
| Replicate | SDXL | $0.008 | $0.80 |
| Stability | SD3 Medium | $0.14 | $14 |
| Stability | SDXL 1.0 | $0.008 | $0.80 |

**Cloudinary:** Free tier (25GB storage, 25GB bandwidth/month)
