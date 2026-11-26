import type { PushService } from '../push/push.service';
import type { TaskReminderCache } from './task-reminder-cache';
import { TaskReminderDispatchService } from './task-reminder-dispatch.service';
import type { TasksRepository } from './tasks.repository';

// Quinta, 26/11/2026 em Brasília (UTC-3).
const TODAY = new Date('2026-11-26T00:00:00Z');
const at = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return { now: () => new Date(Date.UTC(2026, 10, 26, h + 3, m)) };
};
const THURSDAY = 1 << 4;
const FRIDAY = 1 << 5;

describe('TaskReminderDispatchService', () => {
  let cache: { get: jest.Mock };
  let repository: { claimDispatch: jest.Mock; isDone: jest.Mock };
  let push: { broadcast: jest.Mock };

  const build = (time: string) =>
    new TaskReminderDispatchService(
      cache as unknown as TaskReminderCache,
      repository as unknown as TasksRepository,
      push as unknown as PushService,
      at(time),
    );

  beforeEach(() => {
    cache = {
      get: jest.fn().mockResolvedValue([
        {
          id: 'hoje',
          title: 'Banco',
          dueDate: TODAY,
          minuteOfDay: 480,
          repeatDays: null,
        },
        {
          id: 'amanha',
          title: 'Dentista',
          dueDate: new Date('2026-11-27T00:00:00Z'),
          minuteOfDay: 480,
          repeatDays: null,
        },
        {
          id: 'quinta',
          title: 'Academia',
          dueDate: null,
          minuteOfDay: 480,
          repeatDays: THURSDAY,
        },
        {
          id: 'sexta',
          title: 'Inglês',
          dueDate: null,
          minuteOfDay: 480,
          repeatDays: FRIDAY,
        },
      ]),
    };
    repository = {
      claimDispatch: jest.fn().mockResolvedValue(true),
      isDone: jest.fn().mockResolvedValue(false),
    };
    push = {
      broadcast: jest
        .fn()
        .mockResolvedValue({ sent: 1, removed: 0, failed: 0 }),
    };
  });

  it('no horário: avulsa do dia e recorrente que cai hoje; nunca a de outro dia', async () => {
    await expect(build('08:00').dispatchDue()).resolves.toEqual([
      '08:00 Banco',
      '08:00 Academia',
    ]);
    expect(repository.claimDispatch).toHaveBeenCalledWith('hoje', TODAY);
    expect(repository.isDone).toHaveBeenCalledWith('hoje', null);
    expect(repository.isDone).toHaveBeenCalledWith('quinta', TODAY);
    expect(push.broadcast).toHaveBeenCalledWith({
      title: 'Tarefa: Banco',
      body: 'às 08:00',
      url: '/tarefas',
      tag: 'tarefa-hoje',
    });
  });

  it('antes do horário ou mais de 10 minutos depois: nada', async () => {
    await expect(build('07:59').dispatchDue()).resolves.toEqual([]);
    await expect(build('08:11').dispatchDue()).resolves.toEqual([]);
    await expect(build('08:10').dispatchDue()).resolves.toHaveLength(2);
  });

  it('outra chamada já marcou o envio: não manda de novo', async () => {
    repository.claimDispatch.mockResolvedValue(false);
    await expect(build('08:00').dispatchDue()).resolves.toEqual([]);
    expect(push.broadcast).not.toHaveBeenCalled();
  });

  it('já concluída antes do horário: não avisa', async () => {
    repository.isDone.mockImplementation((id: string) =>
      Promise.resolve(id === 'quinta'),
    );
    await expect(build('08:00').dispatchDue()).resolves.toEqual([
      '08:00 Banco',
    ]);
  });
});
