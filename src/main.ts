import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

// middleware for validation exception
import { MongooseExceptionFilter } from './common/filters/mongoose-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(
    new MongooseExceptionFilter(),
  )  

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
