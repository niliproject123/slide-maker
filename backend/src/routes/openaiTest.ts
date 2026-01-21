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
        test: "2. Image Generation (DALL-E, no input image)",
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

      // Test 3: Vision - Text response with image input
      const test3: TestResult = {
        test: "3. Vision (Chat with image input)",
        status: "pending",
      };
      results.push(test3);

      try {
        const start = Date.now();
        const visionRequest = {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: "What color is the main shape in this image? Reply in one word." },
                {
                  type: "image_url" as const,
                  image_url: {
                    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Solid_blue.svg/100px-Solid_blue.svg.png"
                  }
                },
              ],
            }
          ],
          max_tokens: 50,
        };
        test3.request = {
          ...visionRequest,
          messages: [{ role: "user", content: "[text + image_url]" }],
          _note: "Asking about a solid blue image",
        };

        const visionResponse = await openai.chat.completions.create(visionRequest);
        test3.response = {
          content: visionResponse.choices[0]?.message?.content,
          model: visionResponse.model,
          usage: visionResponse.usage,
        };
        test3.status = "success";
        test3.duration = Date.now() - start;
      } catch (err) {
        test3.status = "error";
        test3.error = err instanceof Error ? err.message : String(err);
      }

      // Test 4: Image edit/variation with input image (using gpt-image-1 if available, or describe alternative)
      const test4: TestResult = {
        test: "4. Image Generation with reference (GPT-4o vision + DALL-E)",
        status: "pending",
      };
      results.push(test4);

      try {
        const start = Date.now();
        // First, use vision to describe an image, then generate based on that
        const describeRequest = {
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: "Describe this image in 10 words for an image generation prompt." },
                {
                  type: "image_url" as const,
                  image_url: {
                    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/100px-Camponotus_flavomarginatus_ant.jpg"
                  }
                },
              ],
            }
          ],
          max_tokens: 50,
        };

        const describeResponse = await openai.chat.completions.create(describeRequest);
        const description = describeResponse.choices[0]?.message?.content || "an ant";

        const generateRequest = {
          model: "dall-e-3" as const,
          prompt: `Based on reference: ${description}. Create a simple artistic interpretation.`,
          n: 1,
          size: "1024x1024" as const,
          quality: "standard" as const,
        };

        test4.request = {
          step1_describe: { model: "gpt-4o-mini", input_image: "ant.jpg" },
          step2_generate: generateRequest,
        };

        const generateResponse = await openai.images.generate(generateRequest);
        const generatedData = generateResponse.data?.[0];
        test4.response = {
          description_from_image: description,
          generated_url: generatedData?.url,
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
