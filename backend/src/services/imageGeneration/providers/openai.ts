/**
 * OpenAI DALL-E 3 Provider
 *
 * Text-to-image only. When reference images are provided,
 * they are first analyzed by GPT-4o-mini and the description
 * is added to the prompt.
 */

import OpenAI from "openai";
import type {
  ImageGenerationProvider,
  ProviderInfo,
  GenerateOptions,
  GenerateResult,
} from "../types.js";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Analyze images using GPT-4o-mini vision
 */
async function analyzeImages(imageUrls: string[], prompt: string): Promise<string> {
  const openai = getOpenAI();

  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: prompt },
  ];

  for (const url of imageUrls) {
    content.push({
      type: "image_url",
      image_url: { url },
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content,
      },
    ],
    max_tokens: 500,
  });

  const description = response.choices[0]?.message?.content;
  if (!description) {
    throw new Error("No response from vision model");
  }

  return description;
}

class OpenAIProvider implements ImageGenerationProvider {
  readonly info: ProviderInfo = {
    id: "openai-dalle3",
    name: "DALL-E 3",
    provider: "openai",
    cost: "$0.04/image",
    speed: "medium",
    capabilities: {
      supportsImageReference: false,
      maxReferenceImages: 0,
      maxOutputImages: 1,
      supportedSizes: ["1024x1024", "1792x1024", "1024x1792"],
    },
    envKey: "OPENAI_API_KEY",
  };

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const openai = getOpenAI();
    const {
      prompt,
      referenceImageUrls = [],
      contextText,
      imageCount = 1,
      size = "1792x1024",
      quality = "standard",
    } = options;

    let enhancedPrompt = prompt;

    // If there are reference images, analyze them first to enhance the prompt
    // (DALL-E 3 cannot accept images directly, only text)
    if (referenceImageUrls.length > 0) {
      const imageAnalysis = await analyzeImages(
        referenceImageUrls,
        `Analyze these reference images and describe their key visual elements (style, colors, composition, subjects) in 2-3 sentences. This will be used to guide image generation.`
      );
      enhancedPrompt = `${prompt}\n\nReference image context: ${imageAnalysis}`;
    }

    // If context text is provided, add it to the prompt
    if (contextText && contextText.trim()) {
      enhancedPrompt = `${enhancedPrompt}\n\nAdditional context: ${contextText}`;
    }

    // Generate images (DALL-E 3 only supports n=1, so we loop)
    const images: GenerateResult["images"] = [];
    const count = Math.min(Math.max(1, imageCount), 4);

    for (let i = 0; i < count; i++) {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: size as "1024x1024" | "1792x1024" | "1024x1792",
        quality,
      });

      const imageData = response.data?.[0];
      if (imageData?.url) {
        images.push({
          url: imageData.url,
          revisedPrompt: imageData.revised_prompt || enhancedPrompt,
        });
      }
    }

    if (images.length === 0) {
      throw new Error("Failed to generate any images");
    }

    return {
      images,
      model: "dall-e-3",
      provider: "openai",
    };
  }
}

export function createOpenAIProvider(): ImageGenerationProvider {
  return new OpenAIProvider();
}
