import type { PushService } from '../push/push.service';
import type { ReminderCache } from './reminder-cache';
import type { WaterRepository } from './water.repository';
import {
  DISPATCH_WINDOW_MINUTES,
  WaterReminderDispatchService,
} from './water-reminder-dispatch.service';

const TODAY = new Date('2026-11-25T00:00:00Z');
/** Relógio em "HH:MM" de Brasília no dia 25/11/2026 (UTC-3). */
const at = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return { now: () => new Date(Date.UTC(2026, 10, 25, h + 3, m)) };
};

describe('WaterReminderDispatchService', () => {
  let cache: { get: jest.Mock };
  let repository: {
    claimDispatch: jest.Mock;
    findReminderIntakeOnDay: jest.Mock;
  };
  let push: { broadcast: jest.Mock };

  const build = (time: string) =>
    new WaterReminderDispatchService(
      cache as unknown as ReminderCache,
      repository as unknown as WaterRepository,
      push as unknown as PushService,
      at(time),
    );

  beforeEach(() => {
    cache = {
      get: jest.fn().mockResolvedValue([
        { id: 'r8', minuteOfDay: 8 * 60, amountMl: 500 },
        { id: 'r10', minuteOfDay: 10 * 60 + 30, amountMl: 300 },
      ]),
    };
    repository = {
      claimDispatch: jest.fn().mockResolvedValue(true),
      findReminderIntakeOnDay: jest.fn().mockResolvedValue(null),
    };
    push = {
      broadcast: jest
        .fn()
        .mockResolvedValue({ sent: 1, removed: 0, failed: 0 }),
    };
  });

  it('no horário do lembrete: marca o envio de hoje e notifica', async () => {
    await expect(build('08:00').dispatchDue()).resolves.toEqual({
      notified: ['08:00'],
    });
    expect(repository.claimDispatch).toHaveBeenCalledWith('r8', TODAY);
    expect(push.broadcast).toHaveBeenCalledWith({
      title: 'Hora de beber água 💧',
      body: 'Lembrete das 08:00: 500 mL',
      url: '/',
      tag: 'agua-r8',
    });
  });

  it(`ainda envia até ${DISPATCH_WINDOW_MINUTES} minutos depois (cron atrasado ou servidor acordando)`, async () => {
    await expect(build('08:10').dispatchDue()).resolves.toEqual({
      notified: ['08:00'],
    });
  });

  it('antes do horário ou tarde demais: não envia e nem toca no banco', async () => {
    for (const time of ['07:59', '08:11', '09:00']) {
      await expect(build(time).dispatchDue()).resolves.toEqual({
        notified: [],
      });
    }
    expect(repository.claimDispatch).not.toHaveBeenCalled();
    expect(push.broadcast).not.toHaveBeenCalled();
  });

  it('uma notificação só por lembrete por dia: já marcado, não envia de novo', async () => {
    repository.claimDispatch.mockResolvedValue(false);
    await expect(build('08:01').dispatchDue()).resolves.toEqual({
      notified: [],
    });
    expect(push.broadcast).not.toHaveBeenCalled();
  });

  it('lembrete já marcado como "tomei" antes do horário: não notifica', async () => {
    repository.findReminderIntakeOnDay.mockResolvedValue({ id: 'i1' });
    await expect(build('08:00').dispatchDue()).resolves.toEqual({
      notified: [],
    });
    expect(push.broadcast).not.toHaveBeenCalled();
    // Mas fica marcado: não tenta de novo no minuto seguinte.
    expect(repository.claimDispatch).toHaveBeenCalledWith('r8', TODAY);
  });
});
