import { ConflictException, NotFoundException } from '@nestjs/common';
import type { WaterRepository } from './water.repository';
import { WaterTodayService } from './water-today.service';

// 25/11/2026 23:30 em Brasília (= 26/11 02:30 UTC): "hoje" ainda é dia 25.
const clock = { now: () => new Date('2026-11-26T02:30:00Z') };
const TODAY = new Date('2026-11-25T00:00:00Z');
const YESTERDAY = new Date('2026-11-24T00:00:00Z');

const reminder = (id: string, minuteOfDay: number, amountMl: number) => ({
  id,
  minuteOfDay,
  amountMl,
  deletedAt: null,
  createdAt: new Date(),
});

describe('WaterTodayService', () => {
  let repository: Record<string, jest.Mock>;
  let service: WaterTodayService;

  beforeEach(() => {
    repository = {
      findGoalForDay: jest.fn().mockResolvedValue({ goalMl: 3000 }),
      listActiveReminders: jest.fn().mockResolvedValue([]),
      listIntakesForDay: jest.fn().mockResolvedValue([]),
      findActiveReminder: jest.fn(),
      findReminderIntakeOnDay: jest.fn().mockResolvedValue(null),
      createIntake: jest.fn().mockResolvedValue({}),
      findIntake: jest.fn(),
      deleteIntake: jest.fn().mockResolvedValue({}),
    };
    service = new WaterTodayService(
      repository as unknown as WaterRepository,
      clock,
    );
  });

  describe('getToday', () => {
    it('soma o que foi bebido hoje (Brasília) e diz quanto falta', async () => {
      repository.listActiveReminders.mockResolvedValue([
        reminder('r1', 480, 1000),
        reminder('r2', 630, 1500),
      ]);
      repository.listIntakesForDay.mockResolvedValue([
        {
          id: 'i2',
          amountMl: 300,
          source: 'MANUAL',
          reminderId: null,
          reminder: null,
          createdAt: new Date('2026-11-25T15:40:00Z'),
        },
        {
          id: 'i1',
          amountMl: 1000,
          source: 'REMINDER',
          reminderId: 'r1',
          reminder: { minuteOfDay: 480 },
          createdAt: new Date('2026-11-25T11:05:00Z'),
        },
      ]);

      const today = await service.getToday();

      expect(repository.listIntakesForDay).toHaveBeenCalledWith(TODAY);
      expect(today).toEqual({
        day: '2026-11-25',
        goalMl: 3000,
        totalMl: 1300,
        remainingMl: 1700,
        goalReached: false,
        remindersShortfallMl: 500,
        reminders: [
          { id: 'r1', time: '08:00', amountMl: 1000, intakeId: 'i1' },
          { id: 'r2', time: '10:30', amountMl: 1500, intakeId: null },
        ],
        intakes: [
          {
            id: 'i2',
            time: '12:40',
            amountMl: 300,
            source: 'MANUAL',
            reminderTime: null,
          },
          {
            id: 'i1',
            time: '08:05',
            amountMl: 1000,
            source: 'REMINDER',
            reminderTime: '08:00',
          },
        ],
      });
    });

    it('meta batida: falta 0 e goalReached verdadeiro (≥ meta)', async () => {
      repository.findGoalForDay.mockResolvedValue({ goalMl: 1000 });
      repository.listIntakesForDay.mockResolvedValue([
        {
          id: 'i1',
          amountMl: 1000,
          source: 'MANUAL',
          reminderId: null,
          reminder: null,
          createdAt: new Date(),
        },
      ]);
      await expect(service.getToday()).resolves.toEqual(
        expect.objectContaining({ remainingMl: 0, goalReached: true }),
      );
    });

    it('sem meta: nada de "quanto falta"', async () => {
      repository.findGoalForDay.mockResolvedValue(null);
      await expect(service.getToday()).resolves.toEqual(
        expect.objectContaining({
          goalMl: null,
          remainingMl: null,
          goalReached: null,
        }),
      );
    });
  });

  describe('"tomei"', () => {
    it('registra hoje a quantidade do lembrete', async () => {
      repository.findActiveReminder.mockResolvedValue(
        reminder('r1', 480, 1000),
      );
      await service.confirmReminder('r1');
      expect(repository.createIntake).toHaveBeenCalledWith({
        day: TODAY,
        amountMl: 1000,
        source: 'REMINDER',
        reminderId: 'r1',
      });
    });

    it('lembrete já marcado hoje: 409, sem gravar de novo', async () => {
      repository.findActiveReminder.mockResolvedValue(
        reminder('r1', 480, 1000),
      );
      repository.findReminderIntakeOnDay.mockResolvedValue({ id: 'i1' });
      await expect(service.confirmReminder('r1')).rejects.toThrow(
        new ConflictException('O lembrete das 08:00 já foi marcado hoje'),
      );
      expect(repository.createIntake).not.toHaveBeenCalled();
    });

    it('lembrete excluído ou inexistente: 404', async () => {
      repository.findActiveReminder.mockResolvedValue(null);
      await expect(service.confirmReminder('x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('registro livre vai para hoje', async () => {
    await service.addIntake(300);
    expect(repository.createIntake).toHaveBeenCalledWith({
      day: TODAY,
      amountMl: 300,
      source: 'MANUAL',
    });
  });

  describe('desfazer', () => {
    it('apaga um registro de hoje', async () => {
      repository.findIntake.mockResolvedValue({ id: 'i1', day: TODAY });
      await service.deleteIntake('i1');
      expect(repository.deleteIntake).toHaveBeenCalledWith('i1');
    });

    it('registro de dia anterior não pode ser alterado (409), nada é apagado', async () => {
      repository.findIntake.mockResolvedValue({ id: 'i0', day: YESTERDAY });
      await expect(service.deleteIntake('i0')).rejects.toThrow(
        new ConflictException(
          'Registros de dias anteriores não podem ser alterados',
        ),
      );
      expect(repository.deleteIntake).not.toHaveBeenCalled();
    });

    it('registro inexistente: 404', async () => {
      repository.findIntake.mockResolvedValue(null);
      await expect(service.deleteIntake('x')).rejects.toThrow(
        new NotFoundException('Registro não encontrado'),
      );
    });
  });
});
