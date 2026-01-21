import OpenAI from "openai";

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

export interface GenerateImageOptions {
  prompt: string;
  attachedImageUrls?: string[];
  contextText?: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
}

export interface GenerateImageResult {
  url: string;
  revisedPrompt: string;
}

export interface AnalyzeImageOptions {
  imageUrls: string[];
  prompt: string;
}

export interface AnalyzeImageResult {
  description: string;
}

/**
 * Generate an image using DALL-E 3
 * If attachedImageUrls are provided, first analyzes them with vision to enhance the prompt
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const openai = getOpenAI();
  const { prompt, attachedImageUrls = [], contextText, size = "1792x1024", quality = "standard" } = options;

  let enhancedPrompt = prompt;

  // If there are attached images, analyze them first to enhance the prompt
  if (attachedImageUrls.length > 0) {
    const imageAnalysis = await analyzeImages({
      imageUrls: attachedImageUrls,
      prompt: `Analyze these reference images and describe their key visual elements (style, colors, composition, subjects) in 2-3 sentences. This will be used to guide image generation.`,
    });

    enhancedPrompt = `${prompt}\n\nReference image context: ${imageAnalysis.description}`;
  }

  // If context text is provided, add it to the prompt
  if (contextText && contextText.trim()) {
    enhancedPrompt = `${enhancedPrompt}\n\nAdditional context: ${contextText}`;
  }

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: enhancedPrompt,
    n: 1,
    size,
    quality,
  });

  const imageData = response.data?.[0];
  if (!imageData?.url) {
    throw new Error("No image generated");
  }

  return {
    url: imageData.url,
    revisedPrompt: imageData.revised_prompt || enhancedPrompt,
  };
}

/**
 * Analyze images using GPT-4o vision
 */
export async function analyzeImages(
  options: AnalyzeImageOptions
): Promise<AnalyzeImageResult> {
  const openai = getOpenAI();
  const { imageUrls, prompt } = options;

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

  return { description };
}

/**
 * Generate multiple images (calls DALL-E 3 multiple times since it only supports n=1)
 */
export async function generateMultipleImages(
  options: GenerateImageOptions,
  count: number = 4
): Promise<GenerateImageResult[]> {
  const results: GenerateImageResult[] = [];

  // Generate images sequentially (could be parallelized but may hit rate limits)
  for (let i = 0; i < count; i++) {
    try {
      const result = await generateImage(options);
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate image ${i + 1}:`, error);
      // Continue generating remaining images even if one fails
    }
  }

  if (results.length === 0) {
    throw new Error("Failed to generate any images");
  }

  return results;
}

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}
