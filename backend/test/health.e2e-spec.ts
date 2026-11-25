import { createTestApp, resetDatabase, TestContext } from './e2e/helpers';

describe('Health e infraestrutura (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('GET /api/health é público e responde com o banco no ar', async () => {
    const res = await ctx.http().get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok' });
  });

  it('rota inexistente devolve o formato padrão de erro', async () => {
    const res = await ctx.http().get('/api/nao-existe').expect(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        path: '/api/nao-existe',
        timestamp: expect.any(String),
      }),
    );
  });

  it('as tabelas do modelo existem no banco migrado', async () => {
    const tables = await ctx.prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    expect(tables.map((t) => t.tablename)).toEqual(
      expect.arrayContaining([
        'users',
        'refresh_tokens',
        'push_subscriptions',
        'water_goal_changes',
        'water_reminders',
        'water_intakes',
        'water_reminder_dispatches',
      ]),
    );
  });

  it('o banco recusa uma segunda notificação do mesmo lembrete no mesmo dia', async () => {
    const reminder = await ctx.prisma.waterReminder.create({
      data: { minuteOfDay: 8 * 60, amountMl: 300 },
    });
    const day = new Date('2026-11-25T00:00:00Z');
    await ctx.prisma.waterReminderDispatch.create({
      data: { reminderId: reminder.id, day },
    });
    await expect(
      ctx.prisma.waterReminderDispatch.create({
        data: { reminderId: reminder.id, day },
      }),
    ).rejects.toThrow();
  });

  it('o banco recusa confirmar o mesmo lembrete duas vezes no dia, mas aceita registros livres', async () => {
    const reminder = await ctx.prisma.waterReminder.create({
      data: { minuteOfDay: 10 * 60, amountMl: 250 },
    });
    const day = new Date('2026-11-25T00:00:00Z');
    await ctx.prisma.waterIntake.create({
      data: { day, amountMl: 250, source: 'REMINDER', reminderId: reminder.id },
    });
    await expect(
      ctx.prisma.waterIntake.create({
        data: {
          day,
          amountMl: 250,
          source: 'REMINDER',
          reminderId: reminder.id,
        },
      }),
    ).rejects.toThrow();
    await ctx.prisma.waterIntake.create({
      data: { day, amountMl: 200, source: 'MANUAL' },
    });
    await ctx.prisma.waterIntake.create({
      data: { day, amountMl: 200, source: 'MANUAL' },
    });
  });

  it('o banco recusa quantidade zero e registro livre apontando para lembrete', async () => {
    const reminder = await ctx.prisma.waterReminder.create({
      data: { minuteOfDay: 12 * 60, amountMl: 250 },
    });
    const day = new Date('2026-11-25T00:00:00Z');
    await expect(
      ctx.prisma.waterIntake.create({
        data: { day, amountMl: 0, source: 'MANUAL' },
      }),
    ).rejects.toThrow();
    await expect(
      ctx.prisma.waterIntake.create({
        data: { day, amountMl: 200, source: 'MANUAL', reminderId: reminder.id },
      }),
    ).rejects.toThrow();
  });

  it('não deixa dois lembretes ativos no mesmo horário, mas libera o horário de um excluído', async () => {
    const first = await ctx.prisma.waterReminder.create({
      data: { minuteOfDay: 15 * 60, amountMl: 300 },
    });
    await expect(
      ctx.prisma.waterReminder.create({
        data: { minuteOfDay: 15 * 60, amountMl: 200 },
      }),
    ).rejects.toThrow();
    await ctx.prisma.waterReminder.update({
      where: { id: first.id },
      data: { deletedAt: new Date() },
    });
    await ctx.prisma.waterReminder.create({
      data: { minuteOfDay: 15 * 60, amountMl: 200 },
    });
  });
});
