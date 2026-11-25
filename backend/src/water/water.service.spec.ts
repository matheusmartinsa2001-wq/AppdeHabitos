import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ReminderCache } from './reminder-cache';
import type { WaterRepository } from './water.repository';
import { WaterService } from './water.service';

// 25/11/2026 23:30 em Brasília (= 26/11 02:30 UTC): "hoje" ainda é dia 25.
const clock = {
  now: () => new Date('2026-11-26T02:30:00Z'),
};
const TODAY = new Date('2026-11-25T00:00:00Z');

const reminder = (
  minuteOfDay: number,
  amountMl: number,
  id = `r-${minuteOfDay}`,
) => ({
  id,
  minuteOfDay,
  amountMl,
  deletedAt: null,
  createdAt: new Date(),
});

describe('WaterService', () => {
  let repository: Record<string, jest.Mock>;
  let service: WaterService;
  let reminderCache: { invalidate: jest.Mock };

  beforeEach(() => {
    repository = {
      findGoalForDay: jest.fn().mockResolvedValue(null),
      upsertGoal: jest.fn().mockResolvedValue({}),
      listActiveReminders: jest.fn().mockResolvedValue([]),
      findActiveReminder: jest.fn(),
      findActiveReminderAt: jest.fn().mockResolvedValue(null),
      createReminder: jest.fn(),
      updateReminder: jest.fn(),
      softDeleteReminder: jest.fn().mockResolvedValue({}),
    };
    reminderCache = { invalidate: jest.fn() };
    service = new WaterService(
      repository as unknown as WaterRepository,
      clock,
      reminderCache as unknown as ReminderCache,
    );
  });

  describe('getSettings', () => {
    it('antes da primeira meta: meta nula e sem cálculo de falta', async () => {
      await expect(service.getSettings()).resolves.toEqual({
        goalMl: null,
        goalEffectiveFrom: null,
        reminders: [],
        remindersTotalMl: 0,
        remindersShortfallMl: null,
      });
    });

    it('lembretes abaixo da meta: informa quanto falta (meta do dia de hoje em Brasília)', async () => {
      repository.findGoalForDay.mockResolvedValue({
        goalMl: 3000,
        effectiveFrom: new Date('2026-11-20T00:00:00Z'),
      });
      repository.listActiveReminders.mockResolvedValue([
        reminder(8 * 60, 500),
        reminder(10 * 60 + 30, 1000),
        reminder(13 * 60, 1000),
      ]);

      const settings = await service.getSettings();

      expect(repository.findGoalForDay).toHaveBeenCalledWith(TODAY);
      expect(settings.goalMl).toBe(3000);
      expect(settings.goalEffectiveFrom).toBe('2026-11-20');
      expect(settings.reminders.map((r) => r.time)).toEqual([
        '08:00',
        '10:30',
        '13:00',
      ]);
      expect(settings.remindersTotalMl).toBe(2500);
      expect(settings.remindersShortfallMl).toBe(500);
    });

    it('lembretes que somam a meta ou mais: falta 0', async () => {
      repository.findGoalForDay.mockResolvedValue({
        goalMl: 1000,
        effectiveFrom: TODAY,
      });
      repository.listActiveReminders.mockResolvedValue([
        reminder(480, 600),
        reminder(600, 600),
      ]);
      await expect(service.getSettings()).resolves.toEqual(
        expect.objectContaining({
          remindersTotalMl: 1200,
          remindersShortfallMl: 0,
        }),
      );
    });
  });

  it('setGoal grava a meta com vigência a partir de hoje (Brasília)', async () => {
    await service.setGoal(3500);
    expect(repository.upsertGoal).toHaveBeenCalledWith(TODAY, 3500);
  });

  describe('lembretes', () => {
    it('cria convertendo HH:MM para minuto do dia', async () => {
      repository.createReminder.mockResolvedValue(
        reminder(8 * 60 + 30, 400, 'novo'),
      );
      await expect(
        service.createReminder({ time: '08:30', amountMl: 400 }),
      ).resolves.toEqual({ id: 'novo', time: '08:30', amountMl: 400 });
      expect(repository.createReminder).toHaveBeenCalledWith(510, 400);
    });

    it('recusa dois lembretes no mesmo horário, sem gravar', async () => {
      repository.findActiveReminderAt.mockResolvedValue(reminder(480, 300));
      await expect(
        service.createReminder({ time: '08:00', amountMl: 400 }),
      ).rejects.toThrow(
        new ConflictException('Já existe um lembrete às 08:00'),
      );
      expect(repository.createReminder).not.toHaveBeenCalled();
    });

    it('editar só os mL não confere o horário', async () => {
      repository.findActiveReminder.mockResolvedValue(reminder(480, 300, 'r1'));
      repository.updateReminder.mockResolvedValue(reminder(480, 700, 'r1'));
      await service.updateReminder('r1', { amountMl: 700 });
      expect(repository.findActiveReminderAt).not.toHaveBeenCalled();
      expect(repository.updateReminder).toHaveBeenCalledWith('r1', {
        minuteOfDay: undefined,
        amountMl: 700,
      });
    });

    it('mudar para um horário ocupado por outro lembrete: 409', async () => {
      repository.findActiveReminder.mockResolvedValue(reminder(480, 300, 'r1'));
      repository.findActiveReminderAt.mockResolvedValue(
        reminder(600, 300, 'r2'),
      );
      await expect(
        service.updateReminder('r1', { time: '10:00' }),
      ).rejects.toThrow(ConflictException);
      expect(repository.updateReminder).not.toHaveBeenCalled();
    });

    it('editar ou excluir lembrete inexistente (ou já excluído): 404', async () => {
      repository.findActiveReminder.mockResolvedValue(null);
      await expect(
        service.updateReminder('x', { amountMl: 100 }),
      ).rejects.toThrow(new NotFoundException('Lembrete não encontrado'));
      await expect(service.deleteReminder('x')).rejects.toThrow(
        NotFoundException,
      );
      expect(repository.softDeleteReminder).not.toHaveBeenCalled();
    });

    it('criar, editar e excluir avisam o cache do disparo de notificações', async () => {
      repository.createReminder.mockResolvedValue(reminder(480, 300, 'r1'));
      repository.findActiveReminder.mockResolvedValue(reminder(480, 300, 'r1'));
      repository.updateReminder.mockResolvedValue(reminder(480, 400, 'r1'));
      await service.createReminder({ time: '08:00', amountMl: 300 });
      await service.updateReminder('r1', { amountMl: 400 });
      await service.deleteReminder('r1');
      expect(reminderCache.invalidate).toHaveBeenCalledTimes(3);
    });

    it('excluir é exclusão lógica', async () => {
      repository.findActiveReminder.mockResolvedValue(reminder(480, 300, 'r1'));
      await service.deleteReminder('r1');
      expect(repository.softDeleteReminder).toHaveBeenCalledWith('r1');
    });
  });
});
