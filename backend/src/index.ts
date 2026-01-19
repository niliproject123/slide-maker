import Fastify from "fastify";
import cors from "@fastify/cors";
import { projectRoutes } from "./routes/projects.js";
import { videoRoutes } from "./routes/videos.js";
import { frameRoutes } from "./routes/frames.js";
import { contextRoutes } from "./routes/context.js";
import { generateRoutes } from "./routes/generate.js";
import { imageRoutes } from "./routes/images.js";
import { galleryRoutes } from "./routes/gallery.js";
import { mainChatRoutes } from "./routes/mainChats.js";
import { isOpenAIAvailable } from "./services/imageGeneration.js";

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

async function buildServer() {
  const fastify = Fastify({
    logger: isProduction
      ? true // JSON logs in production
      : {
          level: "info",
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        },
  });

  // Register CORS
  await fastify.register(cors, {
    origin: true, // Allow all origins in development
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Health check endpoint
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      openai: isOpenAIAvailable() ? "enabled" : "disabled",
      imageGeneration: isOpenAIAvailable() ? "openai" : "mock",
    };
  });

  // Register routes
  await fastify.register(projectRoutes);
  await fastify.register(videoRoutes);
  await fastify.register(frameRoutes);
  await fastify.register(contextRoutes);
  await fastify.register(generateRoutes);
  await fastify.register(imageRoutes);
  await fastify.register(galleryRoutes);
  await fastify.register(mainChatRoutes);

  return fastify;
}

async function start() {
  const fastify = await buildServer();

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🖼️  Image generation: ${isOpenAIAvailable() ? "OpenAI (real)" : "Mock (picsum)"}`);
    console.log(`\n📝 API Endpoints:`);
    console.log(`   GET    /projects`);
    console.log(`   POST   /projects`);
    console.log(`   GET    /projects/:id`);
    console.log(`   PUT    /projects/:id`);
    console.log(`   DELETE /projects/:id`);
    console.log(`   GET    /projects/:projectId/videos`);
    console.log(`   POST   /projects/:projectId/videos`);
    console.log(`   GET    /videos/:id`);
    console.log(`   PUT    /videos/:id`);
    console.log(`   DELETE /videos/:id`);
    console.log(`   GET    /videos/:videoId/frames`);
    console.log(`   POST   /videos/:videoId/frames`);
    console.log(`   PUT    /frames/:id`);
    console.log(`   PATCH  /frames/:id/reorder`);
    console.log(`   PATCH  /frames/:id/selected-image`);
    console.log(`   DELETE /frames/:id`);
    console.log(`   DELETE /frames/:id/history`);
    console.log(`   GET    /videos/:videoId/context`);
    console.log(`   PATCH  /videos/:videoId/context`);
    console.log(`   POST   /videos/:videoId/context/images`);
    console.log(`   DELETE /videos/:videoId/context/history`);
    console.log(`   GET    /generation/status`);
    console.log(`   POST   /frames/:frameId/generate`);
    console.log(`   POST   /videos/:videoId/context/generate`);
    console.log(`   POST   /main-chats/:mainChatId/generate`);
    console.log(`   POST   /frames/:frameId/upload`);
    console.log(`   POST   /main-chats/:mainChatId/upload`);
    console.log(`   GET    /projects/:projectId/images`);
    console.log(`   DELETE /images/:id`);
    console.log(`   POST   /images/:id/copy`);
    console.log(`   POST   /images/:id/move`);
    console.log(`   POST   /images/:id/remove`);
    console.log(`   GET    /projects/:projectId/gallery`);
    console.log(`   POST   /projects/:projectId/gallery`);
    console.log(`   DELETE /projects/:projectId/gallery/:imageId`);
    console.log(`   POST   /projects/:projectId/gallery/upload`);
    console.log(`\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
