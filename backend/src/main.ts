import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // CORREÇÃO: Habilitando validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades que não estão no DTO
      transform: true, // Transforma os payloads para os tipos especificados (ex: string para number)
      forbidNonWhitelisted: true, // Rejeita a requisição se enviar campos não mapeados no DTO
    }),
  );

  await app.listen(process.env.PORT ?? 8081);
}

bootstrap();
