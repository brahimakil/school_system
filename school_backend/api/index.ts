import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import express from 'express';

const expressApp = express();
const adapter = new ExpressAdapter(expressApp);

let cachedApp: any;

async function createNestApp() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule, adapter, { cors: true });
    
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    });
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    await app.init();
    cachedApp = app;
  }
  return cachedApp;
}

export default async (req: any, res: any) => {
  await createNestApp();
  return expressApp(req, res);
};
