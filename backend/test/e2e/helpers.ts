import type { Type } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AccountBootstrapService } from '../../src/auth/account-bootstrap.service';
import { E2E_PASSWORD } from './setup-env';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/database/prisma.service';

export interface TestContext {
  app: NestExpressApplication;
  prisma: PrismaService;
  http: () => ReturnType<typeof request>;
}

/** Sobe o app inteiro (mesmos guards, pipes e prefixo de produção) contra o banco de teste. */
export async function createTestApp(
  extraModules: Type[] = [],
): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ...extraModules],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  configureApp(app);
  await app.init();
  const prisma = app.get(PrismaService);
  return { app, prisma, http: () => request(app.getHttpServer()) };
}

/**
 * Esvazia todas as tabelas (menos o histórico de migrations) e recria a conta única
 * a partir de ADMIN_PASSWORD (como no boot do app).
 */
export async function resetDatabase(ctx: TestContext): Promise<void> {
  const tables = await ctx.prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length) {
    const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
    await ctx.prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
    );
  }
  await ctx.app.get(AccountBootstrapService).syncAccount();
}

export interface Session {
  token: string;
  /** Cookie `refreshToken=...` pronto para o header `Cookie`. */
  cookie: string;
  auth: { Authorization: string };
}

export function refreshCookieFrom(res: request.Response): string {
  const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return (
    setCookie.find((c) => c.startsWith('refreshToken='))?.split(';')[0] ?? ''
  );
}

export async function login(
  ctx: TestContext,
  password = E2E_PASSWORD,
): Promise<Session> {
  const res = await ctx
    .http()
    .post('/api/auth/login')
    .send({ password })
    .expect(200);
  const token = (res.body as { accessToken: string }).accessToken;
  return {
    token,
    cookie: refreshCookieFrom(res),
    auth: { Authorization: `Bearer ${token}` },
  };
}
