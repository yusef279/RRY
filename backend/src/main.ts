import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ★ allow frontend origin + credentials (cookies)
  app.enableCors({
    origin: 'http://localhost:3001',
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(3000);
  console.log('Nest running on http://localhost:3000  🚀');
}
bootstrap();