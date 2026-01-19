import OpenAI from "openai";
import type { Image } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./mockStorage.js";

// Initialize OpenAI client only if API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Check if OpenAI is available
export function isOpenAIAvailable(): boolean {
  return openai !== null;
}

// Generate a mock image using picsum
function generateMockImage(messageId: string | null): Image {
  const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const image: Image = {
    id: uuidv4(),
    url: `https://picsum.photos/seed/${seed}/1792/1024`,
    cloudinaryId: `mock-${seed}`,
    messageId,
    createdAt: new Date(),
  };
  storage.images.set(image.id, image);
  return image;
}

// Generate images using OpenAI DALL-E
async function generateOpenAIImage(
  prompt: string,
  messageId: string | null
): Promise<Image> {
  if (!openai) {
    throw new Error("OpenAI is not configured");
  }

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1792x1024",
    });

    const imageData = response.data?.[0];
    const imageUrl = imageData?.url;
    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    const image: Image = {
      id: uuidv4(),
      url: imageUrl,
      cloudinaryId: `openai-${Date.now()}`,
      messageId,
      createdAt: new Date(),
    };
    storage.images.set(image.id, image);
    return image;
  } catch (error) {
    console.error("OpenAI image generation failed:", error);
    throw error;
  }
}

// Main generation function - generates multiple images
export async function generateImages(
  prompt: string,
  messageId: string,
  count: number = 4
): Promise<Image[]> {
  const images: Image[] = [];

  if (openai) {
    // Use OpenAI for real image generation
    // Generate images one at a time (DALL-E 3 doesn't support batch generation well)
    for (let i = 0; i < count; i++) {
      try {
        const image = await generateOpenAIImage(prompt, messageId);
        images.push(image);
      } catch (error) {
        // If OpenAI fails, fall back to mock for remaining images
        console.error(`OpenAI generation ${i + 1}/${count} failed, using mock`);
        const mockImage = generateMockImage(messageId);
        images.push(mockImage);
      }
    }
  } else {
    // Use mock images (picsum)
    for (let i = 0; i < count; i++) {
      const mockImage = generateMockImage(messageId);
      images.push(mockImage);
    }
  }

  return images;
}

// Generate a single image
export async function generateSingleImage(
  prompt: string,
  messageId: string | null
): Promise<Image> {
  if (openai) {
    try {
      return await generateOpenAIImage(prompt, messageId);
    } catch (error) {
      console.error("OpenAI generation failed, using mock");
      return generateMockImage(messageId);
    }
  }
  return generateMockImage(messageId);
}
