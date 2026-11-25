import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { validationExceptionFactory } from './common/validation/validation-messages';

/**
 * Configuração HTTP do app (proxy, segurança, CORS, prefixo, validação). Usada
 * pelo `main.ts` e pelos testes ponta a ponta — o teste sobe o app igual à produção.
 */
export function configureApp(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);

  // Atrás de proxy reverso (provedor de hospedagem), req.ip vem do X-Forwarded-For.
  const trustProxyHops = configService.get<number>('app.trustProxyHops') ?? 0;
  if (trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: configService.get<string>('app.frontendUrl'),
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );
}
