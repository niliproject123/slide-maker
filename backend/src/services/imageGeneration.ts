import OpenAI from "openai";
import type { Image } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";
import { storage } from "./mockStorage.js";

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Store the current API key (masked for display)
let currentApiKey: string | null = process.env.OPENAI_API_KEY || null;

// Test results storage
export interface OpenAITestResult {
  timestamp: string;
  success: boolean;
  mode: "openai" | "mock";
  testType: "startup" | "manual";
  details: {
    apiKeySet: boolean;
    apiKeyMasked: string | null;
    connectionTest?: {
      success: boolean;
      error?: string;
      responseTime?: number;
    };
    imageGenerationTest?: {
      success: boolean;
      error?: string;
      imageUrl?: string;
      responseTime?: number;
    };
  };
  errors: string[];
}

let lastTestResult: OpenAITestResult | null = null;

// Check if OpenAI is available
export function isOpenAIAvailable(): boolean {
  return openai !== null;
}

// Get masked API key for display
function getMaskedApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 8) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// Get current status
export function getOpenAIStatus() {
  return {
    available: openai !== null,
    mode: openai ? "openai" : "mock",
    apiKeySet: currentApiKey !== null,
    apiKeyMasked: getMaskedApiKey(currentApiKey),
    lastTest: lastTestResult,
  };
}

// Update API key at runtime
export function updateApiKey(newKey: string | null): void {
  if (newKey && newKey.trim()) {
    openai = new OpenAI({ apiKey: newKey.trim() });
    currentApiKey = newKey.trim();
  } else {
    openai = null;
    currentApiKey = null;
  }
}

// Test OpenAI connection and image generation
export async function testOpenAIConnection(testType: "startup" | "manual" = "manual"): Promise<OpenAITestResult> {
  const errors: string[] = [];
  const result: OpenAITestResult = {
    timestamp: new Date().toISOString(),
    success: false,
    mode: openai ? "openai" : "mock",
    testType,
    details: {
      apiKeySet: currentApiKey !== null,
      apiKeyMasked: getMaskedApiKey(currentApiKey),
    },
    errors,
  };

  // If no API key, report mock mode
  if (!openai) {
    result.success = true; // Mock mode is valid
    result.details.connectionTest = {
      success: true,
      error: "No API key configured - using mock mode",
    };
    errors.push("OpenAI API key not set - running in mock mode (using picsum.photos for images)");
    lastTestResult = result;
    return result;
  }

  // Test 1: Connection test (list models or simple API call)
  const connectionStart = Date.now();
  try {
    // Try to list models as a simple connection test
    await openai.models.list();
    result.details.connectionTest = {
      success: true,
      responseTime: Date.now() - connectionStart,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.details.connectionTest = {
      success: false,
      error: errorMessage,
      responseTime: Date.now() - connectionStart,
    };
    errors.push(`Connection test failed: ${errorMessage}`);
  }

  // Test 2: Image generation test (only if connection succeeded)
  if (result.details.connectionTest?.success) {
    const genStart = Date.now();
    try {
      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt: "A simple test image: a blue circle on white background",
        n: 1,
        size: "256x256", // Use small size for test to save credits
      });

      const imageData = response.data?.[0];
      const imageUrl = imageData?.url;

      if (imageUrl) {
        result.details.imageGenerationTest = {
          success: true,
          imageUrl,
          responseTime: Date.now() - genStart,
        };
      } else {
        result.details.imageGenerationTest = {
          success: false,
          error: "No image URL in response",
          responseTime: Date.now() - genStart,
        };
        errors.push("Image generation returned no URL");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.details.imageGenerationTest = {
        success: false,
        error: errorMessage,
        responseTime: Date.now() - genStart,
      };
      errors.push(`Image generation test failed: ${errorMessage}`);
    }
  }

  // Determine overall success
  result.success =
    (result.details.connectionTest?.success ?? false) &&
    (result.details.imageGenerationTest?.success ?? false);

  lastTestResult = result;
  return result;
}

// Run startup test (called when server starts)
export async function runStartupTest(): Promise<void> {
  console.log("\n🔍 Testing OpenAI connection...");

  const result = await testOpenAIConnection("startup");

  if (result.mode === "mock") {
    console.log("⚠️  OpenAI: Running in MOCK mode (no API key)");
    console.log("   Set OPENAI_API_KEY environment variable to enable real image generation");
  } else if (result.success) {
    console.log("✅ OpenAI: Connection successful!");
    console.log(`   API Key: ${result.details.apiKeyMasked}`);
    if (result.details.connectionTest?.responseTime) {
      console.log(`   Connection test: ${result.details.connectionTest.responseTime}ms`);
    }
    if (result.details.imageGenerationTest?.responseTime) {
      console.log(`   Image generation test: ${result.details.imageGenerationTest.responseTime}ms`);
    }
  } else {
    console.error("❌ OpenAI: Connection FAILED!");
    console.error(`   API Key: ${result.details.apiKeyMasked}`);
    for (const error of result.errors) {
      console.error(`   Error: ${error}`);
    }
    console.log("   Falling back to mock mode for image generation");
  }
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
