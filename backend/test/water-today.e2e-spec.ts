import { brasiliaNow } from '../src/common/utils/brasilia';
import {
  createTestApp,
  login,
  resetDatabase,
  Session,
  TestContext,
} from './e2e/helpers';

interface Today {
  day: string;
  goalMl: number | null;
  totalMl: number;
  remainingMl: number | null;
  goalReached: boolean | null;
  reminders: {
    id: string;
    time: string;
    amountMl: number;
    intakeId: string | null;
  }[];
  intakes: {
    id: string;
    amountMl: number;
    source: string;
    reminderTime: string | null;
  }[];
}

describe('Água do dia (e2e)', () => {
  let ctx: TestContext;
  let session: Session;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx);
    // Um login só: o limite é de 5 tentativas por minuto.
    session = await login(ctx);
  });

  beforeEach(async () => {
    await ctx.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE water_intakes, water_reminder_dispatches, water_reminders, water_goal_changes CASCADE',
    );
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  const today = async () =>
    (await ctx.http().get('/api/water/today').set(session.auth).expect(200))
      .body as Today;

  async function setup() {
    await ctx
      .http()
      .put('/api/water/goal')
      .set(session.auth)
      .send({ goalMl: 2000 })
      .expect(200);
    const res = await ctx
      .http()
      .post('/api/water/reminders')
      .set(session.auth)
      .send({ time: '08:00', amountMl: 500 })
      .expect(201);
    return (res.body as { id: string }).id;
  }

  it('exige login', async () => {
    await ctx.http().get('/api/water/today').expect(401);
    await ctx
      .http()
      .post('/api/water/intakes')
      .send({ amountMl: 200 })
      .expect(401);
  });

  it('"tomei" + registros livres somam no dia e mostram quanto falta até a meta', async () => {
    const reminderId = await setup();

    const confirmed = await ctx
      .http()
      .post(`/api/water/reminders/${reminderId}/confirm`)
      .set(session.auth)
      .expect(200);
    expect((confirmed.body as Today).reminders[0].intakeId).not.toBeNull();

    await ctx
      .http()
      .post('/api/water/intakes')
      .set(session.auth)
      .send({ amountMl: 300 })
      .expect(201);
    const last = await ctx
      .http()
      .post('/api/water/intakes')
      .set(session.auth)
      .send({ amountMl: 200 })
      .expect(201);

    const body = last.body as Today;
    expect(body.day).toBe(brasiliaNow().today.toISOString().slice(0, 10));
    expect(body.totalMl).toBe(1000);
    expect(body.remainingMl).toBe(1000);
    expect(body.goalReached).toBe(false);
    expect(body.intakes.map((i) => i.amountMl)).toEqual([200, 300, 500]);
    expect(body.intakes[2]).toEqual(
      expect.objectContaining({ source: 'REMINDER', reminderTime: '08:00' }),
    );
  });

  it('o mesmo lembrete não é marcado duas vezes no dia', async () => {
    const reminderId = await setup();
    await ctx
      .http()
      .post(`/api/water/reminders/${reminderId}/confirm`)
      .set(session.auth)
      .expect(200);
    const res = await ctx
      .http()
      .post(`/api/water/reminders/${reminderId}/confirm`)
      .set(session.auth)
      .expect(409);
    expect((res.body as { message: string }).message).toBe(
      'O lembrete das 08:00 já foi marcado hoje',
    );
    expect((await today()).totalMl).toBe(500);
  });

  it('meta batida ao chegar na meta', async () => {
    await setup();
    for (const amountMl of [1000, 1000]) {
      await ctx
        .http()
        .post('/api/water/intakes')
        .set(session.auth)
        .send({ amountMl })
        .expect(201);
    }
    const t = await today();
    expect(t.remainingMl).toBe(0);
    expect(t.goalReached).toBe(true);
  });

  it('desfazer: apaga o registro de hoje e libera o "tomei" do lembrete', async () => {
    const reminderId = await setup();
    const confirmed = await ctx
      .http()
      .post(`/api/water/reminders/${reminderId}/confirm`)
      .set(session.auth)
      .expect(200);
    const intakeId = (confirmed.body as Today).reminders[0].intakeId as string;

    const res = await ctx
      .http()
      .delete(`/api/water/intakes/${intakeId}`)
      .set(session.auth)
      .expect(200);
    expect((res.body as Today).totalMl).toBe(0);
    expect((res.body as Today).reminders[0].intakeId).toBeNull();

    await ctx
      .http()
      .post(`/api/water/reminders/${reminderId}/confirm`)
      .set(session.auth)
      .expect(200);
  });

  it('registro de dia anterior não pode ser apagado', async () => {
    const yesterday = new Date(brasiliaNow().today.getTime() - 86_400_000);
    const old = await ctx.prisma.waterIntake.create({
      data: { day: yesterday, amountMl: 400, source: 'MANUAL' },
    });
    const res = await ctx
      .http()
      .delete(`/api/water/intakes/${old.id}`)
      .set(session.auth)
      .expect(409);
    expect((res.body as { message: string }).message).toBe(
      'Registros de dias anteriores não podem ser alterados',
    );
    expect(await ctx.prisma.waterIntake.count()).toBe(1);
    // E não entra no total de hoje.
    expect((await today()).totalMl).toBe(0);
  });

  it('registro livre fora dos limites (50 a 2.000 mL): 400 em português', async () => {
    const res = await ctx
      .http()
      .post('/api/water/intakes')
      .set(session.auth)
      .send({ amountMl: 10 })
      .expect(400);
    expect((res.body as { message: string[] }).message).toEqual([
      'Quantidade precisa ser no mínimo 50',
    ]);
    await ctx
      .http()
      .post('/api/water/intakes')
      .set(session.auth)
      .send({ amountMl: 2001 })
      .expect(400);
  });

  it('lembrete excluído não pode ser marcado; o registro dele continua somando', async () => {
    const reminderId = await setup();
    await ctx
      .http()
      .post(`/api/water/reminders/${reminderId}/confirm`)
      .set(session.auth)
      .expect(200);
    await ctx
      .http()
      .delete(`/api/water/reminders/${reminderId}`)
      .set(session.auth)
      .expect(204);

    const t = await today();
    expect(t.reminders).toEqual([]);
    expect(t.totalMl).toBe(500);
    await ctx
      .http()
      .post(`/api/water/reminders/${reminderId}/confirm`)
      .set(session.auth)
      .expect(404);
  });
});
