import { brasiliaNow } from '../src/common/utils/brasilia';
import {
  createTestApp,
  login,
  resetDatabase,
  Session,
  TestContext,
} from './e2e/helpers';

interface Settings {
  goalMl: number | null;
  goalEffectiveFrom: string | null;
  reminders: { id: string; time: string; amountMl: number }[];
  remindersTotalMl: number;
  remindersShortfallMl: number | null;
}

describe('Água: meta e lembretes (e2e)', () => {
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

  const settings = async () =>
    (await ctx.http().get('/api/water/settings').set(session.auth).expect(200))
      .body as Settings;

  it('exige login', async () => {
    await ctx.http().get('/api/water/settings').expect(401);
    await ctx.http().put('/api/water/goal').send({ goalMl: 3000 }).expect(401);
  });

  it('meta: vale a partir de hoje; mudar de novo no mesmo dia só atualiza', async () => {
    expect((await settings()).goalMl).toBeNull();

    await ctx
      .http()
      .put('/api/water/goal')
      .set(session.auth)
      .send({ goalMl: 3000 })
      .expect(200);
    const res = await ctx
      .http()
      .put('/api/water/goal')
      .set(session.auth)
      .send({ goalMl: 3500 })
      .expect(200);

    const today = brasiliaNow().today.toISOString().slice(0, 10);
    expect((res.body as Settings).goalMl).toBe(3500);
    expect((res.body as Settings).goalEffectiveFrom).toBe(today);
    expect(await ctx.prisma.waterGoalChange.count()).toBe(1);
  });

  it('meta de um dia anterior fica guardada quando a meta muda hoje', async () => {
    const yesterday = new Date(brasiliaNow().today.getTime() - 86_400_000);
    await ctx.prisma.waterGoalChange.create({
      data: { effectiveFrom: yesterday, goalMl: 2000 },
    });
    expect((await settings()).goalMl).toBe(2000);

    await ctx
      .http()
      .put('/api/water/goal')
      .set(session.auth)
      .send({ goalMl: 4000 })
      .expect(200);

    const history = await ctx.prisma.waterGoalChange.findMany({
      orderBy: { effectiveFrom: 'asc' },
    });
    expect(history.map((h) => h.goalMl)).toEqual([2000, 4000]);
  });

  it('meta fora dos limites (500 a 10.000 mL): 400 em português', async () => {
    const res = await ctx
      .http()
      .put('/api/water/goal')
      .set(session.auth)
      .send({ goalMl: 100 })
      .expect(400);
    expect((res.body as { message: string[] }).message).toEqual([
      'Meta diária precisa ser no mínimo 500',
    ]);
    await ctx
      .http()
      .put('/api/water/goal')
      .set(session.auth)
      .send({ goalMl: 10_001 })
      .expect(400);
  });

  it('lembretes: cria, lista em ordem de horário, soma e mostra quanto falta para a meta', async () => {
    await ctx
      .http()
      .put('/api/water/goal')
      .set(session.auth)
      .send({ goalMl: 3000 })
      .expect(200);
    for (const [time, amountMl] of [
      ['13:00', 500],
      ['08:00', 1000],
      ['10:30', 1000],
    ] as const) {
      await ctx
        .http()
        .post('/api/water/reminders')
        .set(session.auth)
        .send({ time, amountMl })
        .expect(201);
    }

    const s = await settings();
    expect(s.reminders.map((r) => r.time)).toEqual(['08:00', '10:30', '13:00']);
    expect(s.remindersTotalMl).toBe(2500);
    expect(s.remindersShortfallMl).toBe(500);
  });

  it('não deixa dois lembretes no mesmo horário (409 com mensagem)', async () => {
    await ctx
      .http()
      .post('/api/water/reminders')
      .set(session.auth)
      .send({ time: '08:00', amountMl: 300 })
      .expect(201);
    const res = await ctx
      .http()
      .post('/api/water/reminders')
      .set(session.auth)
      .send({ time: '08:00', amountMl: 500 })
      .expect(409);
    expect((res.body as { message: string }).message).toBe(
      'Já existe um lembrete às 08:00',
    );
  });

  it('edita horário e mL; exclui e libera o horário', async () => {
    const created = await ctx
      .http()
      .post('/api/water/reminders')
      .set(session.auth)
      .send({ time: '08:00', amountMl: 300 })
      .expect(201);
    const id = (created.body as { id: string }).id;

    await ctx
      .http()
      .patch(`/api/water/reminders/${id}`)
      .set(session.auth)
      .send({ time: '09:15', amountMl: 450 })
      .expect(200, { id, time: '09:15', amountMl: 450 });

    await ctx
      .http()
      .delete(`/api/water/reminders/${id}`)
      .set(session.auth)
      .expect(204);
    expect((await settings()).reminders).toEqual([]);

    // Exclusão lógica: a linha continua no banco.
    expect(await ctx.prisma.waterReminder.count()).toBe(1);

    await ctx
      .http()
      .post('/api/water/reminders')
      .set(session.auth)
      .send({ time: '09:15', amountMl: 200 })
      .expect(201);
    await ctx
      .http()
      .patch(`/api/water/reminders/${id}`)
      .set(session.auth)
      .send({ amountMl: 100 })
      .expect(404);
  });

  it('validação dos lembretes em português', async () => {
    const res = await ctx
      .http()
      .post('/api/water/reminders')
      .set(session.auth)
      .send({ time: '25:00', amountMl: 10 })
      .expect(400);
    expect((res.body as { message: string[] }).message).toEqual(
      expect.arrayContaining([
        'Horário precisa estar no formato HH:MM (ex.: 08:30)',
        'Quantidade precisa ser no mínimo 50',
      ]),
    );
    await ctx
      .http()
      .post('/api/water/reminders')
      .set(session.auth)
      .send({ time: '08:00', amountMl: 2001 })
      .expect(400);
    await ctx
      .http()
      .patch('/api/water/reminders/nao-e-uuid')
      .set(session.auth)
      .send({ amountMl: 100 })
      .expect(400);
  });
});
