import type { WaterRepository } from './water.repository';
import { WaterHistoryService } from './water-history.service';

const d = (day: string) => new Date(`${day}T00:00:00Z`);
// 25/11/2026 15:00 em Brasília.
const clock = { now: () => new Date('2026-11-25T18:00:00Z') };

describe('WaterHistoryService', () => {
  let repository: { listGoalChanges: jest.Mock; sumIntakesByDay: jest.Mock };
  let service: WaterHistoryService;

  const totals = (entries: Record<string, number>) =>
    repository.sumIntakesByDay.mockResolvedValue(
      Object.entries(entries).map(([day, totalMl]) => ({
        day: d(day),
        totalMl,
      })),
    );

  beforeEach(() => {
    repository = {
      listGoalChanges: jest.fn().mockResolvedValue([
        { effectiveFrom: d('2026-11-20'), goalMl: 2000 },
        { effectiveFrom: d('2026-11-23'), goalMl: 3000 },
      ]),
      sumIntakesByDay: jest.fn().mockResolvedValue([]),
    };
    service = new WaterHistoryService(
      repository as unknown as WaterRepository,
      clock,
    );
  });

  it('cada dia é avaliado pela meta que valia nele; antes da primeira meta e futuro ficam sem avaliação; hoje neutro', async () => {
    totals({
      '2026-11-20': 2000, // meta 2000: batida (≥)
      '2026-11-21': 1999, // não batida
      '2026-11-22': 2500, // batida
      '2026-11-23': 2500, // meta mudou para 3000: não batida
      '2026-11-24': 3000, // batida
      '2026-11-25': 3500, // hoje: neutro
    });

    const history = await service.getMonth('2026-11');
    const status = Object.fromEntries(
      history.days.map((day) => [day.day, day.status]),
    );

    expect(history.days).toHaveLength(30);
    expect(status['2026-11-19']).toBe('none');
    expect(status['2026-11-20']).toBe('met');
    expect(status['2026-11-21']).toBe('missed');
    expect(status['2026-11-22']).toBe('met');
    expect(status['2026-11-23']).toBe('missed');
    expect(status['2026-11-24']).toBe('met');
    expect(status['2026-11-25']).toBe('today');
    expect(status['2026-11-26']).toBe('none');
    expect(history.days.find((day) => day.day === '2026-11-23')).toEqual({
      day: '2026-11-23',
      status: 'missed',
      goalMl: 3000,
      totalMl: 2500,
    });

    // 5 dias fechados (20 a 24), 3 batidos.
    expect(history.metDays).toBe(3);
    expect(history.evaluatedDays).toBe(5);
    expect(history.percent).toBe(60);
    expect(history.firstDay).toBe('2026-11-20');
  });

  it('dia sem nenhum registro conta como não batido', async () => {
    totals({});
    const history = await service.getMonth('2026-11');
    expect(history.days.find((day) => day.day === '2026-11-21')?.status).toBe(
      'missed',
    );
    expect(history.metDays).toBe(0);
    expect(history.percent).toBe(0);
  });

  describe('sequência', () => {
    it('conta os dias seguidos até ontem', async () => {
      totals({ '2026-11-22': 2000, '2026-11-23': 3000, '2026-11-24': 3000 });
      expect((await service.getMonth()).currentStreak).toBe(3);
    });

    it('hoje entra na conta se a meta já foi batida', async () => {
      totals({ '2026-11-24': 3000, '2026-11-25': 3000 });
      expect((await service.getMonth()).currentStreak).toBe(2);
    });

    it('ontem não batido zera a sequência', async () => {
      totals({ '2026-11-22': 3000, '2026-11-23': 3000 });
      expect((await service.getMonth()).currentStreak).toBe(0);
    });
  });

  it('navegação: volta até o mês da primeira meta e avança até o mês atual', async () => {
    const november = await service.getMonth();
    expect(november.month).toBe('2026-11');
    expect(november.canGoBack).toBe(false);
    expect(november.canGoForward).toBe(false);

    repository.listGoalChanges.mockResolvedValue([
      { effectiveFrom: d('2026-10-10'), goalMl: 2000 },
    ]);
    const october = await service.getMonth('2026-10');
    expect(october.canGoBack).toBe(false);
    expect(october.canGoForward).toBe(true);
    expect((await service.getMonth()).canGoBack).toBe(true);
  });

  it('sem nenhuma meta: nada avaliado', async () => {
    repository.listGoalChanges.mockResolvedValue([]);
    const history = await service.getMonth();
    expect(history.days.every((day) => day.status === 'none')).toBe(true);
    expect(history.percent).toBeNull();
    expect(history.currentStreak).toBe(0);
    expect(history.firstDay).toBeNull();
    expect(repository.sumIntakesByDay).not.toHaveBeenCalled();
  });
});
