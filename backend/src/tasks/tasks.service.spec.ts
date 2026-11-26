import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

// Quinta, 26/11/2026 23:30 em Brasília (= 27/11 02:30 UTC): "hoje" ainda é dia 26.
const clock = { now: () => new Date('2026-11-27T02:30:00Z') };
const day = (value: string) => new Date(`${value}T00:00:00Z`);
const TODAY = day('2026-11-26');
const THURSDAY = 1 << 4;
const MON_WED_FRI = (1 << 1) | (1 << 3) | (1 << 5);
const EVERY_DAY = 127;

type Completion = { id: string; day: Date; completedAt: Date };
let seq = 0;
function task(
  overrides: Partial<{
    id: string;
    title: string;
    dueDate: Date | null;
    dueMinuteOfDay: number | null;
    repeatDays: number | null;
    completions: Completion[];
  }> = {},
) {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Tarefa ${seq}`,
    dueDate: null,
    dueMinuteOfDay: null,
    repeatDays: null,
    createdAt: new Date(Date.UTC(2026, 10, 1, 0, seq)),
    completions: [] as Completion[],
    ...overrides,
  };
}
const doneOn = (value: Date, id = 'c'): Completion[] => [
  { id, day: value, completedAt: new Date('2026-11-26T12:00:00Z') },
];

describe('TasksService', () => {
  let repository: Record<string, jest.Mock>;
  let service: TasksService;

  beforeEach(() => {
    repository = {
      listForLists: jest.fn().mockResolvedValue([]),
      findActive: jest.fn(),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      softDelete: jest.fn().mockResolvedValue({}),
      createCompletion: jest.fn().mockResolvedValue({}),
      deleteCompletion: jest.fn().mockResolvedValue({}),
    };
    service = new TasksService(repository as unknown as TasksRepository, clock);
  });

  describe('getLists', () => {
    it('separa Hoje, Próximas e Atrasadas pelo dia de Brasília', async () => {
      repository.listForLists.mockResolvedValue([
        task({ id: 'sem-data' }),
        task({ id: 'hoje', dueDate: TODAY }),
        task({ id: 'amanha', dueDate: day('2026-11-27') }),
        task({ id: 'ontem', dueDate: day('2026-11-25') }),
      ]);
      const lists = await service.getLists();
      expect(repository.listForLists).toHaveBeenCalledWith(TODAY);
      expect(lists.day).toBe('2026-11-26');
      expect(lists.today.map((t) => t.id)).toEqual(['sem-data', 'hoje']);
      expect(lists.upcoming.map((t) => t.id)).toEqual(['amanha']);
      expect(lists.overdue.map((t) => t.id)).toEqual(['ontem']);
      expect(lists.recurring).toEqual([]);
    });

    it('Hoje: por horário, sem horário no fim, e as concluídas hoje por último', async () => {
      repository.listForLists.mockResolvedValue([
        task({
          id: 'feita',
          dueDate: TODAY,
          dueMinuteOfDay: 300,
          completions: doneOn(TODAY),
        }),
        task({ id: 'sem-horario', dueDate: TODAY }),
        task({ id: '18h', dueDate: TODAY, dueMinuteOfDay: 1080 }),
        task({ id: 'rec-07h', repeatDays: EVERY_DAY, dueMinuteOfDay: 420 }),
        task({ id: '09h', dueDate: TODAY, dueMinuteOfDay: 540 }),
      ]);
      const lists = await service.getLists();
      expect(lists.today.map((t) => [t.id, t.time, t.done])).toEqual([
        ['rec-07h', '07:00', false],
        ['09h', '09:00', false],
        ['18h', '18:00', false],
        ['sem-horario', null, false],
        ['feita', '05:00', true],
      ]);
    });

    it('tarefa com data futura concluída hoje aparece em Hoje, riscada', async () => {
      repository.listForLists.mockResolvedValue([
        task({
          id: 'adiantada',
          dueDate: day('2026-12-01'),
          completions: doneOn(TODAY),
        }),
      ]);
      const lists = await service.getLists();
      expect(lists.today).toEqual([
        {
          id: 'adiantada',
          title: expect.any(String) as string,
          date: '2026-12-01',
          time: null,
          repeat: null,
          done: true,
        },
      ]);
      expect(lists.upcoming).toEqual([]);
    });

    it('recorrente: aparece em Hoje só no dia da semana dela e sempre em Recorrentes', async () => {
      repository.listForLists.mockResolvedValue([
        task({ id: 'quinta', repeatDays: THURSDAY }),
        task({ id: 'seg-qua-sex', repeatDays: MON_WED_FRI }),
        task({
          id: 'feita-hoje',
          repeatDays: EVERY_DAY,
          completions: doneOn(TODAY),
        }),
      ]);
      const lists = await service.getLists();
      expect(lists.today.map((t) => [t.id, t.done])).toEqual([
        ['quinta', false],
        ['feita-hoje', true],
      ]);
      expect(lists.recurring.map((t) => [t.id, t.repeat])).toEqual([
        ['quinta', [4]],
        ['seg-qua-sex', [1, 3, 5]],
        ['feita-hoje', [0, 1, 2, 3, 4, 5, 6]],
      ]);
      expect([...lists.upcoming, ...lists.overdue]).toEqual([]);
    });
  });

  describe('create', () => {
    it('cria avulsa com data e horário', async () => {
      await service.create({
        title: 'Mercado',
        date: '2026-11-27',
        time: '08:30',
      });
      expect(repository.create).toHaveBeenCalledWith(
        {
          title: 'Mercado',
          dueDate: day('2026-11-27'),
          dueMinuteOfDay: 510,
          repeatDays: null,
        },
        TODAY,
      );
    });

    it('cria sem data', async () => {
      await service.create({ title: 'Ler um livro' });
      expect(repository.create).toHaveBeenCalledWith(
        {
          title: 'Ler um livro',
          dueDate: null,
          dueMinuteOfDay: null,
          repeatDays: null,
        },
        TODAY,
      );
    });

    it('cria recorrente com horário e sem data', async () => {
      await service.create({
        title: 'Academia',
        repeat: [5, 1, 3],
        time: '06:00',
      });
      expect(repository.create).toHaveBeenCalledWith(
        {
          title: 'Academia',
          dueDate: null,
          dueMinuteOfDay: 360,
          repeatDays: MON_WED_FRI,
        },
        TODAY,
      );
    });

    it('recorrente com data é recusada', async () => {
      await expect(
        service.create({ title: 'X', repeat: [1], date: '2026-11-27' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('aceita hoje, mas recusa data antes de hoje', async () => {
      await service.create({ title: 'Hoje', date: '2026-11-26' });
      await expect(
        service.create({ title: 'Ontem', date: '2026-11-25' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recusa dia que não existe', async () => {
      await expect(
        service.create({ title: 'X', date: '2026-02-30' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('recusa horário em avulsa sem data', async () => {
      await expect(
        service.create({ title: 'X', time: '10:00' }),
      ).rejects.toThrow(BadRequestException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('campo ausente não muda', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: TODAY, dueMinuteOfDay: 600 }),
      );
      await service.update('t', { title: 'Novo título' });
      expect(repository.update).toHaveBeenCalledWith(
        't',
        { title: 'Novo título' },
        TODAY,
      );
    });

    it('tirar a data tira também o horário', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: TODAY, dueMinuteOfDay: 600 }),
      );
      await service.update('t', { date: null });
      expect(repository.update).toHaveBeenCalledWith(
        't',
        { dueDate: null, dueMinuteOfDay: null },
        TODAY,
      );
    });

    it('remarca uma atrasada para hoje ou depois, nunca para o passado', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: day('2026-11-20') }),
      );
      await service.update('t', { date: '2026-11-28' });
      expect(repository.update).toHaveBeenCalledWith(
        't',
        { dueDate: day('2026-11-28') },
        TODAY,
      );
      await expect(service.update('t', { date: '2026-11-21' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('editar só o título de uma atrasada não exige remarcar', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: day('2026-11-20'), dueMinuteOfDay: 60 }),
      );
      await service.update('t', { title: 'Outro' });
      expect(repository.update).toHaveBeenCalledWith(
        't',
        { title: 'Outro' },
        TODAY,
      );
    });

    it('horário numa avulsa sem data é recusado', async () => {
      repository.findActive.mockResolvedValue(task({ id: 't' }));
      await expect(service.update('t', { time: '10:00' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('recorrente: muda dias e horário (a regra nova vale de hoje em diante)', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', repeatDays: EVERY_DAY }),
      );
      await service.update('t', { repeat: [1, 3, 5], time: '07:30' });
      expect(repository.update).toHaveBeenCalledWith(
        't',
        { repeatDays: MON_WED_FRI, dueMinuteOfDay: 450 },
        TODAY,
      );
    });

    it('recorrente não vira avulsa nem ganha data; avulsa não vira recorrente', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 'r', repeatDays: EVERY_DAY }),
      );
      await expect(service.update('r', { repeat: null })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('r', { date: '2026-11-27' })).rejects.toThrow(
        BadRequestException,
      );

      repository.findActive.mockResolvedValue(task({ id: 'a' }));
      await expect(service.update('a', { repeat: [1] })).rejects.toThrow(
        BadRequestException,
      );
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('tarefa inexistente ou excluída: 404', async () => {
      repository.findActive.mockResolvedValue(null);
      await expect(service.update('x', { title: 'a' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('exclusão lógica', async () => {
      repository.findActive.mockResolvedValue(task({ id: 't' }));
      await service.remove('t');
      expect(repository.softDelete).toHaveBeenCalledWith('t');
    });
  });

  describe('complete / undoComplete', () => {
    it('avulsa: conclui hoje, mesmo atrasada', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: day('2026-11-20') }),
      );
      await service.complete('t');
      expect(repository.createCompletion).toHaveBeenCalledWith('t', TODAY);
    });

    it('avulsa: não conclui duas vezes', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', completions: doneOn(TODAY) }),
      );
      await expect(service.complete('t')).rejects.toThrow(ConflictException);
    });

    it('recorrente: conclui a ocorrência de hoje, mesmo já concluída em outro dia', async () => {
      repository.findActive.mockResolvedValue(
        task({
          id: 'r',
          repeatDays: EVERY_DAY,
          completions: doneOn(day('2026-11-25')),
        }),
      );
      await service.complete('r');
      expect(repository.createCompletion).toHaveBeenCalledWith('r', TODAY);
    });

    it('recorrente: não conclui se não cai hoje, nem duas vezes no dia', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 'r', repeatDays: MON_WED_FRI }),
      );
      await expect(service.complete('r')).rejects.toThrow(ConflictException);

      repository.findActive.mockResolvedValue(
        task({ id: 'r', repeatDays: EVERY_DAY, completions: doneOn(TODAY) }),
      );
      await expect(service.complete('r')).rejects.toThrow(ConflictException);
      expect(repository.createCompletion).not.toHaveBeenCalled();
    });

    it('desfaz no mesmo dia', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', completions: doneOn(TODAY, 'c1') }),
      );
      await service.undoComplete('t');
      expect(repository.deleteCompletion).toHaveBeenCalledWith('c1');
    });

    it('não desfaz conclusão de outro dia (avulsa ou recorrente)', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', completions: doneOn(day('2026-11-25')) }),
      );
      await expect(service.undoComplete('t')).rejects.toThrow(
        ConflictException,
      );
      repository.findActive.mockResolvedValue(
        task({
          id: 'r',
          repeatDays: EVERY_DAY,
          completions: doneOn(day('2026-11-25')),
        }),
      );
      await expect(service.undoComplete('r')).rejects.toThrow(
        ConflictException,
      );
      expect(repository.deleteCompletion).not.toHaveBeenCalled();
    });

    it('desfazer tarefa não concluída: 409', async () => {
      repository.findActive.mockResolvedValue(task({ id: 't' }));
      await expect(service.undoComplete('t')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
