import { Controller, Get, Module } from '@nestjs/common';
import {
  createTestApp,
  login,
  refreshCookieFrom,
  resetDatabase,
  TestContext,
} from './e2e/helpers';

describe('Login com senha (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('a conta única é criada a partir de ADMIN_PASSWORD, guardando só o hash', async () => {
    const users = await ctx.prisma.user.findMany();
    expect(users).toHaveLength(1);
    expect(users[0].passwordHash).not.toContain('senha-de-teste-e2e');
    expect(users[0].passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('senha certa devolve o access token e o refresh token só em cookie httpOnly', async () => {
    const res = await ctx
      .http()
      .post('/api/auth/login')
      .send({ password: 'senha-de-teste-e2e' })
      .expect(200);

    expect(Object.keys(res.body as object)).toEqual(['accessToken']);
    const setCookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    const cookie = setCookie.find((c) => c.startsWith('refreshToken='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('senha errada: 401 "Senha incorreta"', async () => {
    const res = await ctx
      .http()
      .post('/api/auth/login')
      .send({ password: 'errada' })
      .expect(401);
    expect((res.body as { message: string }).message).toBe('Senha incorreta');
  });

  it('senha vazia ou campo a mais: 400 em português', async () => {
    const res = await ctx
      .http()
      .post('/api/auth/login')
      .send({ password: '', email: 'x@y.z' })
      .expect(400);
    expect((res.body as { message: string[] }).message).toEqual(
      expect.arrayContaining([
        'Senha é obrigatório',
        'O campo "email" não é aceito aqui',
      ]),
    );
  });

  it('refresh troca o token; o antigo, reusado depois, derruba todas as sessões', async () => {
    const session = await login(ctx);

    const renewed = await ctx
      .http()
      .post('/api/auth/refresh')
      .set('Cookie', session.cookie)
      .expect(200);
    const newCookie = refreshCookieFrom(renewed);
    expect(newCookie).not.toBe(session.cookie);

    // Simula o reuso depois da janela de renovação simultânea.
    await ctx.prisma.refreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60_000) },
    });
    await ctx
      .http()
      .post('/api/auth/refresh')
      .set('Cookie', session.cookie)
      .expect(401);

    // O token novo também foi revogado por precaução.
    await ctx
      .http()
      .post('/api/auth/refresh')
      .set('Cookie', newCookie)
      .expect(401);
  });

  it('logout encerra a sessão: o refresh token deixa de valer', async () => {
    const session = await login(ctx);
    await ctx
      .http()
      .post('/api/auth/logout')
      .set('Cookie', session.cookie)
      .expect(204);
    await ctx
      .http()
      .post('/api/auth/refresh')
      .set('Cookie', session.cookie)
      .expect(401);
  });

  it('refresh sem cookie: 401', async () => {
    await ctx.http().post('/api/auth/refresh').expect(401);
  });
});

describe('Limite de tentativas de login (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('a 6ª tentativa no mesmo minuto recebe 429, mesmo com a senha certa', async () => {
    for (let i = 0; i < 5; i++) {
      await ctx
        .http()
        .post('/api/auth/login')
        .send({ password: `chute-${i}` })
        .expect(401);
    }
    await ctx
      .http()
      .post('/api/auth/login')
      .send({ password: 'senha-de-teste-e2e' })
      .expect(429);
  });
});

@Controller('e2e-protegida')
class ProtectedProbeController {
  @Get()
  get() {
    return { ok: true };
  }
}

@Module({ controllers: [ProtectedProbeController] })
class ProbeModule {}

describe('Rotas protegidas por padrão (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp([ProbeModule]);
    await resetDatabase(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('rota sem @Public() exige login', async () => {
    await ctx.http().get('/api/e2e-protegida').expect(401);
    const session = await login(ctx);
    await ctx
      .http()
      .get('/api/e2e-protegida')
      .set(session.auth)
      .expect(200, { ok: true });
  });

  it('token inválido: 401', async () => {
    await ctx
      .http()
      .get('/api/e2e-protegida')
      .set({ Authorization: 'Bearer inventado' })
      .expect(401);
  });
});
