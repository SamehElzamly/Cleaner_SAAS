import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

// middleware for validation exception
import { MongooseExceptionFilter } from './common/filters/mongoose-exception.filter.js';

async function bootstrap() {
  // rawBody: مطلوب لـ POST /payments/webhook (التوقيع محسوب على البايتات الأصلية)
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // يشيل أي حقل مش معرّف في الـ DTO
      forbidNonWhitelisted: true, // ويرفض الطلب بدل ما يتجاهل بصمت
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new MongooseExceptionFilter());

  // CORS للمتصفح بس (تطبيقات الموبايل مش بتتأثر). مثال:
  // CORS_ORIGINS=https://app.example.com,http://localhost:5173
  const origins = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
  app.enableCors(origins?.length ? { origin: origins, credentials: true } : undefined);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap(); // بدون await على مستوى الملف: نفس شكل مثال Vercel الرسمي