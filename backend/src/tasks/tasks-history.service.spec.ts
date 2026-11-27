import { TasksHistoryService } from './tasks-history.service';
import type { TasksRepository } from './tasks.repository';

// Quinta, 26/11/2026 15:00 em Brasília.
const clock = { now: () => new Date('2026-11-26T18:00:00Z') };
const day = (value: string) => new Date(`${value}T00:00:00Z`);
/** Instante ao meio-dia de Brasília do dia dado. */
const noon = (value: string) => new Date(`${value}T15:00:00Z`);
const EVERY_DAY = 127;
const MON_WED_FRI = (1 << 1) | (1 << 3) | (1 << 5);

function task(
  overrides: Partial<{
    id: string;
    title: string;
    dueDate: Date | null;
    repeatDays: number | null;
    createdAt: Date;
    deletedAt: Date | null;
    completions: { day: Date }[];
    repeatChanges: { effectiveFrom: Date; repeatDays: number }[];
  }>,
) {
  return {
    id: 'id',
    title: 'Tarefa',
    dueDate: null,
    repeatDays: null,
    createdAt: noon('2026-11-20'),
    deletedAt: null,
    completions: [],
    repeatChanges: [],
    ...overrides,
  };
}

describe('TasksHistoryService', () => {
  let repository: { listForHistory: jest.Mock };
  const build = () =>
    new TasksHistoryService(repository as unknown as TasksRepository, clock);
  const statusOf = (
    result: Awaited<ReturnType<TasksHistoryService['getMonth']>>,
    value: string,
  ) => result.days.find((d) => d.day === value);

  beforeEach(() => {
    repository = { listForHistory: jest.fn().mockResolvedValue([]) };
  });

  it('sem tarefas: nada avaliado', async () => {
    const result = await build().getMonth();
    expect(result.month).toBe('2026-11');
    expect(result.days).toHaveLength(30);
    expect(result.days.every((d) => d.status === 'none')).toBe(true);
    expect(result).toMatchObject({
      firstDay: null,
      percent: null,
      currentStreak: 0,
      canGoBack: false,
      canGoForward: false,
    });
  });

  it('recorrente todo dia: verde quando feita, vermelho quando não; hoje neutro', async () => {
    repository.listForHistory.mockResolvedValue([
      task({
        id: 'r',
        title: 'Academia',
        repeatDays: EVERY_DAY,
        repeatChanges: [
          { effectiveFrom: day('2026-11-20'), repeatDays: EVERY_DAY },
        ],
        completions: [
          { day: day('2026-11-20') },
          { day: day('2026-11-22') },
          { day: day('2026-11-23') },
          { day: day('2026-11-24') },
          { day: day('2026-11-25') },
        ],
      }),
    ]);
    const result = await build().getMonth();
    expect(result.firstDay).toBe('2026-11-20');
    expect(statusOf(result, '2026-11-19')?.status).toBe('none');
    expect(statusOf(result, '2026-11-20')).toMatchObject({
      status: 'met',
      completed: 1,
      planned: [{ id: 'r', title: 'Academia', done: true }],
    });
    expect(statusOf(result, '2026-11-21')?.status).toBe('missed');
    expect(statusOf(result, '2026-11-26')?.status).toBe('today');
    expect(statusOf(result, '2026-11-27')?.status).toBe('none');
    // 20, 22, 23, 24, 25 feitos; 21 não → 5 de 6.
    expect(result).toMatchObject({ metDays: 5, evaluatedDays: 6, percent: 83 });
    // Hoje ainda não feito: sequência = 22..25.
    expect(result.currentStreak).toBe(4);
  });

  it('dia sem tarefa fica cinza e não quebra a sequência; hoje entra se já fez tudo', async () => {
    repository.listForHistory.mockResolvedValue([
      task({
        id: 'r',
        repeatDays: MON_WED_FRI,
        repeatChanges: [
          { effectiveFrom: day('2026-11-20'), repeatDays: MON_WED_FRI },
        ],
        // sex 20, seg 23, qua 25 feitas.
        completions: [
          { day: day('2026-11-20') },
          { day: day('2026-11-23') },
          { day: day('2026-11-25') },
        ],
      }),
      task({
        id: 'hoje',
        dueDate: day('2026-11-26'),
        completions: [{ day: day('2026-11-26') }],
      }),
    ]);
    const result = await build().getMonth();
    expect(statusOf(result, '2026-11-21')?.status).toBe('empty');
    expect(statusOf(result, '2026-11-24')?.status).toBe('empty');
    expect(result).toMatchObject({
      metDays: 3,
      evaluatedDays: 3,
      percent: 100,
    });
    expect(result.currentStreak).toBe(4);
  });

  it('avulsa: conta como feita se concluída até o dia; depois disso o dia fica vermelho', async () => {
    repository.listForHistory.mockResolvedValue([
      task({
        id: 'cedo',
        dueDate: day('2026-11-24'),
        completions: [{ day: day('2026-11-22') }],
      }),
      task({
        id: 'tarde',
        dueDate: day('2026-11-23'),
        completions: [{ day: day('2026-11-25') }],
      }),
      task({ id: 'sem-data', completions: [{ day: day('2026-11-21') }] }),
    ]);
    const result = await build().getMonth();
    expect(statusOf(result, '2026-11-24')?.status).toBe('met');
    expect(statusOf(result, '2026-11-23')?.status).toBe('missed');
    // A sem data não entra no que era do dia, mas conta no número de concluídas.
    expect(statusOf(result, '2026-11-21')).toMatchObject({
      status: 'empty',
      completed: 1,
    });
    expect(statusOf(result, '2026-11-25')).toMatchObject({
      status: 'empty',
      completed: 1,
    });
  });

  it('recorrente: cada dia usa a regra de dias da época; a exclusão vale do dia dela em diante', async () => {
    repository.listForHistory.mockResolvedValue([
      task({
        id: 'r',
        repeatDays: MON_WED_FRI,
        deletedAt: noon('2026-11-25'),
        repeatChanges: [
          { effectiveFrom: day('2026-11-20'), repeatDays: EVERY_DAY },
          { effectiveFrom: day('2026-11-23'), repeatDays: MON_WED_FRI },
        ],
      }),
    ]);
    const result = await build().getMonth();
    expect(statusOf(result, '2026-11-21')?.status).toBe('missed'); // sáb, regra antiga
    expect(statusOf(result, '2026-11-24')?.status).toBe('empty'); // ter, regra nova
    expect(statusOf(result, '2026-11-23')?.status).toBe('missed'); // seg
    expect(statusOf(result, '2026-11-25')?.status).toBe('empty'); // excluída nesse dia
  });

  it('navegação entre meses', async () => {
    repository.listForHistory.mockResolvedValue([
      task({ createdAt: noon('2026-10-05') }),
    ]);
    const result = await build().getMonth('2026-10');
    expect(result).toMatchObject({
      month: '2026-10',
      canGoBack: false,
      canGoForward: true,
    });
    expect(result.days).toHaveLength(31);
  });
});
