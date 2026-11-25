import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  configureApp(app);

  // Em produção o Swagger nem é montado.
  const swaggerEnabled =
    configService.get<string>('app.nodeEnv') !== 'production';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('App de Hábitos API')
      .setDescription('API do App de Hábitos')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);
  Logger.log(`Aplicação rodando em http://localhost:${port}/api`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    'Falha ao iniciar a aplicação',
    error instanceof Error ? error.stack : undefined,
    'Bootstrap',
  );
  process.exit(1);
});
