import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import OpenAI from "openai";

interface TestResult {
  test: string;
  status: "pending" | "success" | "error";
  request?: unknown;
  response?: unknown;
  error?: string;
  duration?: number;
}

export async function openaiTestRoutes(fastify: FastifyInstance) {
  // GET /openai-test - Run all OpenAI tests
  fastify.get(
    "/openai-test",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const results: TestResult[] = [];

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return reply.status(500).send({
          error: "OPENAI_API_KEY not configured",
          results: [],
        });
      }

      const openai = new OpenAI({ apiKey });

      // Test 1: Text response (chat completion)
      const test1: TestResult = {
        test: "1. Text Response (Chat Completion)",
        status: "pending",
      };
      results.push(test1);

      try {
        const start = Date.now();
        const chatRequest = {
          model: "gpt-4o-mini",
          messages: [
            { role: "user" as const, content: "Say 'Hello from OpenAI!' in exactly 5 words." }
          ],
          max_tokens: 50,
        };
        test1.request = chatRequest;

        const chatResponse = await openai.chat.completions.create(chatRequest);
        test1.response = {
          content: chatResponse.choices[0]?.message?.content,
          model: chatResponse.model,
          usage: chatResponse.usage,
        };
        test1.status = "success";
        test1.duration = Date.now() - start;
      } catch (err) {
        test1.status = "error";
        test1.error = err instanceof Error ? err.message : String(err);
      }

      // Test 2: Image generation (without input image)
      const test2: TestResult = {
        test: "2. Image Generation (DALL-E, text prompt only)",
        status: "pending",
      };
      results.push(test2);

      try {
        const start = Date.now();
        const imageRequest = {
          model: "dall-e-3" as const,
          prompt: "A simple red circle on a white background, minimal, clean",
          n: 1,
          size: "1024x1024" as const,
          quality: "standard" as const,
        };
        test2.request = imageRequest;

        const imageResponse = await openai.images.generate(imageRequest);
        const imageData = imageResponse.data?.[0];
        test2.response = {
          url: imageData?.url,
          revised_prompt: imageData?.revised_prompt,
        };
        test2.status = "success";
        test2.duration = Date.now() - start;
      } catch (err) {
        test2.status = "error";
        test2.error = err instanceof Error ? err.message : String(err);
      }

      // Test 3: Vision - Describe an image (image in → text out)
      const test3: TestResult = {
        test: "3. Vision: Describe Image (image → text)",
        status: "pending",
      };
      results.push(test3);

      const inputImageUrl3 = "https://picsum.photos/id/237/400/400";

      try {
        const start = Date.now();
        test3.request = {
          model: "gpt-4o-mini",
          prompt: "Describe this image in detail.",
          input_image_url: inputImageUrl3,
        };

        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: "Describe this image in detail. What do you see?" },
                {
                  type: "image_url" as const,
                  image_url: { url: inputImageUrl3 }
                },
              ],
            }
          ],
          max_tokens: 200,
        });

        test3.response = {
          input_image_url: inputImageUrl3,
          description: visionResponse.choices[0]?.message?.content,
          model: visionResponse.model,
        };
        test3.status = "success";
        test3.duration = Date.now() - start;
      } catch (err) {
        test3.status = "error";
        test3.error = err instanceof Error ? err.message : String(err);
      }

      // Test 4: Image Modification - Take image, request change, generate new (image → image)
      const test4: TestResult = {
        test: "4. Image Modification: Change Image (image → new image)",
        status: "pending",
      };
      results.push(test4);

      const inputImageUrl4 = "https://picsum.photos/id/1025/400/400"; // A dog

      try {
        const start = Date.now();

        // Step 1: Analyze the input image
        const analyzeResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user" as const,
              content: [
                {
                  type: "text" as const,
                  text: "Describe this image briefly for an image generation prompt (max 20 words). Focus on the main subject."
                },
                {
                  type: "image_url" as const,
                  image_url: { url: inputImageUrl4 }
                },
              ],
            }
          ],
          max_tokens: 50,
        });

        const originalDescription = analyzeResponse.choices[0]?.message?.content || "a dog";

        // Step 2: Generate modified version
        const modificationPrompt = `${originalDescription}, but make it a cartoon/illustration style with vibrant colors`;

        const generateResponse = await openai.images.generate({
          model: "dall-e-3" as const,
          prompt: modificationPrompt,
          n: 1,
          size: "1024x1024" as const,
          quality: "standard" as const,
        });

        const generatedData = generateResponse.data?.[0];

        test4.request = {
          input_image_url: inputImageUrl4,
          modification: "Convert to cartoon/illustration style",
          steps: ["1. Analyze input image", "2. Generate modified version"],
        };

        test4.response = {
          input_image_url: inputImageUrl4,
          original_description: originalDescription,
          modification_prompt: modificationPrompt,
          output_image_url: generatedData?.url,
          revised_prompt: generatedData?.revised_prompt,
        };
        test4.status = "success";
        test4.duration = Date.now() - start;
      } catch (err) {
        test4.status = "error";
        test4.error = err instanceof Error ? err.message : String(err);
      }

      const allPassed = results.every((r) => r.status === "success");

      return reply.send({
        summary: {
          total: results.length,
          passed: results.filter((r) => r.status === "success").length,
          failed: results.filter((r) => r.status === "error").length,
          allPassed,
        },
        results,
      });
    }
  );
}
