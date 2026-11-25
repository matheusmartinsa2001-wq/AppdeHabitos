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
      'TRUNCATE TABLE water_intakes, water_reminder_dispatches, water_reminders, water_goal_changes, push_subscriptions CASCADE',
    );
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
        .expect(200, { notified: [] });
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
        .expect(200, { notified: [] });
      expect(await ctx.prisma.waterReminderDispatch.count()).toBe(1);
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
        .expect(200, { notified: [] });
    });
  });
});
