import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();

async function createApp() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );
  
  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'https://school-system-taupe.vercel.app',
      process.env.CORS_ORIGIN,
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Enable validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  await app.init();
  return app;
}

// For Vercel serverless
let app: any;
export default async (req: any, res: any) => {
  if (!app) {
    app = await createApp();
  }
  return server(req, res);
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  async function bootstrap() {
    const app = await createApp();
    await app.listen(process.env.PORT ?? 3000);
    console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  }
  bootstrap();
}
