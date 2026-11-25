import { brasiliaNow } from '../src/common/utils/brasilia';
import {
  createTestApp,
  login,
  resetDatabase,
  Session,
  TestContext,
} from './e2e/helpers';

interface History {
  month: string;
  days: {
    day: string;
    status: string;
    goalMl: number | null;
    totalMl: number;
  }[];
  metDays: number;
  evaluatedDays: number;
  percent: number | null;
  currentStreak: number;
}

const DAY_MS = 86_400_000;

describe('Água: histórico do mês (e2e)', () => {
  let ctx: TestContext;
  let session: Session;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx);
    session = await login(ctx);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('exige login', async () => {
    await ctx.http().get('/api/water/history').expect(401);
  });

  it('mês inválido: 400 em português', async () => {
    const res = await ctx
      .http()
      .get('/api/water/history?month=2026-13')
      .set(session.auth)
      .expect(400);
    expect((res.body as { message: string[] }).message).toEqual([
      'Mês precisa estar no formato AAAA-MM (ex.: 2026-11)',
    ]);
  });

  it('dias fechados em verde/vermelho pela meta do dia, hoje neutro, sequência e percentual', async () => {
    const { today } = brasiliaNow();
    const daysAgo = (n: number) => new Date(today.getTime() - n * DAY_MS);

    await ctx.prisma.waterGoalChange.create({
      data: { effectiveFrom: daysAgo(3), goalMl: 1000 },
    });
    await ctx.prisma.waterIntake.createMany({
      data: [
        { day: daysAgo(3), amountMl: 400, source: 'MANUAL' }, // não batida
        { day: daysAgo(2), amountMl: 1000, source: 'MANUAL' }, // batida
        { day: daysAgo(1), amountMl: 600, source: 'MANUAL' },
        { day: daysAgo(1), amountMl: 600, source: 'MANUAL' }, // batida (1200)
      ],
    });

    // Consulta o mês de cada dia (os 3 dias podem cruzar a virada do mês).
    const statusOf = async (day: Date) => {
      const key = day.toISOString().slice(0, 10);
      const res = await ctx
        .http()
        .get(`/api/water/history?month=${key.slice(0, 7)}`)
        .set(session.auth)
        .expect(200);
      return (res.body as History).days.find((d) => d.day === key);
    };

    expect(await statusOf(daysAgo(4))).toEqual(
      expect.objectContaining({ status: 'none' }),
    );
    expect(await statusOf(daysAgo(3))).toEqual(
      expect.objectContaining({ status: 'missed', goalMl: 1000, totalMl: 400 }),
    );
    expect(await statusOf(daysAgo(2))).toEqual(
      expect.objectContaining({ status: 'met' }),
    );
    expect(await statusOf(daysAgo(1))).toEqual(
      expect.objectContaining({ status: 'met', totalMl: 1200 }),
    );
    expect(await statusOf(today)).toEqual(
      expect.objectContaining({ status: 'today' }),
    );

    const current = (
      await ctx.http().get('/api/water/history').set(session.auth).expect(200)
    ).body as History;
    expect(current.month).toBe(today.toISOString().slice(0, 7));
    expect(current.currentStreak).toBe(2);
  });
});
