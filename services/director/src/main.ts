import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { RedisIoAdapter } from "./broadcast/redis-io.adapter";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Use Socket.io adapter with Redis for horizontal scaling support
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Enable CORS for REST endpoints (Socket.io CORS is handled by the adapter)
  app.enableCors({
    origin: process.env.EDITOR_URL || "http://localhost:3000",
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`Director service is running on: http://localhost:${port}`);
}

bootstrap();
