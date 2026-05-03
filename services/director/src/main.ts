import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true })
  );
  
  // Use WS adapter instead of Socket.io (which is the default)
  app.useWebSocketAdapter(new WsAdapter(app));
  
  // Enable CORS
  app.enableCors();
  
  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`Director service is running on: http://localhost:${port}`);
}

bootstrap();
