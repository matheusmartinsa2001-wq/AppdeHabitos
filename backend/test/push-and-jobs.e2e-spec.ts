import { TaskReminderCache } from '../src/tasks/task-reminder-cache';
import { ReminderCache } from '../src/water/reminder-cache';
import { brasiliaNow } from '../src/common/utils/brasilia';
import {
  createTestApp,
  login,
  resetDatabase,
  Session,
  TestContext,
} from './e2e/helpers';
import { E2E_CRON_SECRET } from './e2e/setup-env';

describe('Notificações: inscrições e disparo do cron (e2e)', () => {
  let ctx: TestContext;
  let session: Session;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx);
    session = await login(ctx);
  });

  beforeEach(async () => {
    await ctx.prisma.$executeRawUnsafe(
      'TRUNCATE TABLE water_intakes, water_reminder_dispatches, water_reminders, water_goal_changes, task_reminder_dispatches, task_completions, task_repeat_changes, tasks, push_subscriptions CASCADE',
    );
    // As tabelas foram esvaziadas por fora do app: os caches dos lembretes também.
    ctx.app.get(ReminderCache).invalidate();
    ctx.app.get(TaskReminderCache).invalidate();
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  // Endpoint que recusa conexão na hora: o envio falha sem derrubar o disparo.
  const subscription = {
    endpoint: 'https://127.0.0.1:1/push/aparelho-de-teste',
    keys: {
      p256dh:
        'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
      auth: 'tBHItJI5svbpez7KI4CCXg',
    },
  };

  describe('inscrição do aparelho', () => {
    it('exige login', async () => {
      await ctx.http().get('/api/push/status').expect(401);
      await ctx
        .http()
        .post('/api/push/subscriptions')
        .send(subscription)
        .expect(401);
    });

    it('status devolve a chave pública VAPID', async () => {
      const res = await ctx
        .http()
        .get('/api/push/status')
        .set(session.auth)
        .expect(200);
      expect(res.body).toEqual({
        enabled: true,
        publicKey: expect.any(String),
      });
    });

    it('inscrever o mesmo aparelho duas vezes não duplica; cancelar apaga', async () => {
      for (let i = 0; i < 2; i++) {
        await ctx
          .http()
          .post('/api/push/subscriptions')
          .set(session.auth)
          .send(subscription)
          .expect(204);
      }
      expect(await ctx.prisma.pushSubscription.count()).toBe(1);

      await ctx
        .http()
        .delete('/api/push/subscriptions')
        .set(session.auth)
        .send({ endpoint: subscription.endpoint })
        .expect(204);
      expect(await ctx.prisma.pushSubscription.count()).toBe(0);
    });

    it('endpoint sem https é recusado', async () => {
      await ctx
        .http()
        .post('/api/push/subscriptions')
        .set(session.auth)
        .send({ ...subscription, endpoint: 'http://inseguro.test/x' })
        .expect(400);
    });
  });

  describe('disparo pelo cron (POST /api/jobs/water-reminders)', () => {
    const dispatch = () => ctx.http().post('/api/jobs/water-reminders');

    it('sem o segredo ou com segredo errado: 401', async () => {
      await dispatch().expect(401);
      await dispatch().set('X-Cron-Secret', 'errado').expect(401);
      await dispatch().set('X-Cron-Secret', `${E2E_CRON_SECRET}x`).expect(401);
    });

    it('com o segredo e nada no horário: nada a enviar', async () => {
      await dispatch()
        .set('X-Cron-Secret', E2E_CRON_SECRET)
        .expect(200, { notified: [], tasks: [] });
    });

    it('lembrete no horário: notifica uma vez só no dia, mesmo com o cron chamando de novo', async () => {
      const { minuteOfDay } = brasiliaNow();
      const time = `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
      await ctx
        .http()
        .post('/api/water/reminders')
        .set(session.auth)
        .send({ time, amountMl: 300 })
        .expect(201);
      await ctx
        .http()
        .post('/api/push/subscriptions')
        .set(session.auth)
        .send(subscription)
        .expect(204);

      const first = await dispatch()
        .set('X-Cron-Secret', E2E_CRON_SECRET)
        .expect(200);
      expect((first.body as { notified: string[] }).notified).toEqual([time]);

      await dispatch()
        .set('X-Cron-Secret', E2E_CRON_SECRET)
        .expect(200, { notified: [], tasks: [] });
      expect(await ctx.prisma.waterReminderDispatch.count()).toBe(1);
    });

    it('tarefa com horário: notifica no dia dela, uma vez só, e não se já concluída', async () => {
      const now = brasiliaNow();
      const { minuteOfDay } = now;
      const time = `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
      const today = now.today.toISOString().slice(0, 10);
      await ctx
        .http()
        .post('/api/push/subscriptions')
        .set(session.auth)
        .send(subscription)
        .expect(204);
      await ctx
        .http()
        .post('/api/tasks')
        .set(session.auth)
        .send({ title: 'Ligar para o banco', date: today, time })
        .expect(201);
      const done = await ctx
        .http()
        .post('/api/tasks')
        .set(session.auth)
        .send({ title: 'Já feita', repeat: [0, 1, 2, 3, 4, 5, 6], time })
        .expect(201);
      const doneId = (done.body as { recurring: { id: string }[] }).recurring[0]
        .id;
      await ctx
        .http()
        .post(`/api/tasks/${doneId}/complete`)
        .set(session.auth)
        .expect(200);

      const first = await dispatch()
        .set('X-Cron-Secret', E2E_CRON_SECRET)
        .expect(200);
      expect((first.body as { tasks: string[] }).tasks).toEqual([
        `${time} Ligar para o banco`,
      ]);
      await dispatch()
        .set('X-Cron-Secret', E2E_CRON_SECRET)
        .expect(200, { notified: [], tasks: [] });
    });

    it('lembrete já marcado como "tomei" antes do horário não é notificado', async () => {
      const { minuteOfDay } = brasiliaNow();
      const time = `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
      const created = await ctx
        .http()
        .post('/api/water/reminders')
        .set(session.auth)
        .send({ time, amountMl: 300 })
        .expect(201);
      await ctx
        .http()
        .post(
          `/api/water/reminders/${(created.body as { id: string }).id}/confirm`,
        )
        .set(session.auth)
        .expect(200);

      await dispatch()
        .set('X-Cron-Secret', E2E_CRON_SECRET)
        .expect(200, { notified: [], tasks: [] });
    });
  });
});
