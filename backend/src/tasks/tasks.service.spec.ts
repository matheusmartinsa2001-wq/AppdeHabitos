import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { TasksRepository } from './tasks.repository';
import { TasksService } from './tasks.service';

// 26/11/2026 23:30 em Brasília (= 27/11 02:30 UTC): "hoje" ainda é dia 26.
const clock = { now: () => new Date('2026-11-27T02:30:00Z') };
const day = (value: string) => new Date(`${value}T00:00:00Z`);
const TODAY = day('2026-11-26');

let seq = 0;
function task(
  overrides: Partial<{
    id: string;
    title: string;
    dueDate: Date | null;
    dueMinuteOfDay: number | null;
    completions: { id: string; day: Date; completedAt: Date }[];
  }> = {},
) {
  seq += 1;
  return {
    id: `t${seq}`,
    title: `Tarefa ${seq}`,
    dueDate: null,
    dueMinuteOfDay: null,
    createdAt: new Date(Date.UTC(2026, 10, 1, 0, seq)),
    completions: [],
    ...overrides,
  };
}

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
      expect(lists.today.map((t) => t.id)).toEqual(['hoje', 'sem-data']);
      expect(lists.upcoming.map((t) => t.id)).toEqual(['amanha']);
      expect(lists.overdue.map((t) => t.id)).toEqual(['ontem']);
    });

    it('Hoje: por horário, sem horário no fim, e as concluídas hoje por último', async () => {
      repository.listForLists.mockResolvedValue([
        task({
          id: 'feita',
          dueDate: TODAY,
          dueMinuteOfDay: 300,
          completions: [
            {
              id: 'c1',
              day: TODAY,
              completedAt: new Date('2026-11-26T12:00:00Z'),
            },
          ],
        }),
        task({ id: 'sem-horario', dueDate: TODAY }),
        task({ id: '18h', dueDate: TODAY, dueMinuteOfDay: 1080 }),
        task({ id: '09h', dueDate: TODAY, dueMinuteOfDay: 540 }),
      ]);
      const lists = await service.getLists();
      expect(lists.today.map((t) => [t.id, t.time, t.done])).toEqual([
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
          completions: [{ id: 'c1', day: TODAY, completedAt: new Date() }],
        }),
      ]);
      const lists = await service.getLists();
      expect(lists.today).toEqual([
        {
          id: 'adiantada',
          title: expect.any(String),
          date: '2026-12-01',
          time: null,
          done: true,
        },
      ]);
      expect(lists.upcoming).toEqual([]);
    });
  });

  describe('create', () => {
    it('cria com data e horário', async () => {
      await service.create({
        title: 'Mercado',
        date: '2026-11-27',
        time: '08:30',
      });
      expect(repository.create).toHaveBeenCalledWith({
        title: 'Mercado',
        dueDate: day('2026-11-27'),
        dueMinuteOfDay: 510,
      });
    });

    it('cria sem data', async () => {
      await service.create({ title: 'Ler um livro' });
      expect(repository.create).toHaveBeenCalledWith({
        title: 'Ler um livro',
        dueDate: null,
        dueMinuteOfDay: null,
      });
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

    it('recusa horário sem data', async () => {
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
      expect(repository.update).toHaveBeenCalledWith('t', {
        title: 'Novo título',
      });
    });

    it('tirar a data tira também o horário', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: TODAY, dueMinuteOfDay: 600 }),
      );
      await service.update('t', { date: null });
      expect(repository.update).toHaveBeenCalledWith('t', {
        dueDate: null,
        dueMinuteOfDay: null,
      });
    });

    it('remarca uma atrasada para hoje ou depois, nunca para o passado', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: day('2026-11-20') }),
      );
      await service.update('t', { date: '2026-11-28' });
      expect(repository.update).toHaveBeenCalledWith('t', {
        dueDate: day('2026-11-28'),
      });
      await expect(service.update('t', { date: '2026-11-21' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('editar só o título de uma atrasada não exige remarcar', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: day('2026-11-20'), dueMinuteOfDay: 60 }),
      );
      await service.update('t', { title: 'Outro' });
      expect(repository.update).toHaveBeenCalledWith('t', { title: 'Outro' });
    });

    it('horário numa tarefa sem data é recusado', async () => {
      repository.findActive.mockResolvedValue(task({ id: 't' }));
      await expect(service.update('t', { time: '10:00' })).rejects.toThrow(
        BadRequestException,
      );
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
    it('conclui hoje, mesmo atrasada', async () => {
      repository.findActive.mockResolvedValue(
        task({ id: 't', dueDate: day('2026-11-20') }),
      );
      await service.complete('t');
      expect(repository.createCompletion).toHaveBeenCalledWith('t', TODAY);
    });

    it('não conclui duas vezes', async () => {
      repository.findActive.mockResolvedValue(
        task({
          id: 't',
          completions: [{ id: 'c', day: TODAY, completedAt: new Date() }],
        }),
      );
      await expect(service.complete('t')).rejects.toThrow(ConflictException);
    });

    it('desfaz no mesmo dia', async () => {
      repository.findActive.mockResolvedValue(
        task({
          id: 't',
          completions: [{ id: 'c', day: TODAY, completedAt: new Date() }],
        }),
      );
      await service.undoComplete('t');
      expect(repository.deleteCompletion).toHaveBeenCalledWith('c');
    });

    it('não desfaz conclusão de outro dia', async () => {
      repository.findActive.mockResolvedValue(
        task({
          id: 't',
          completions: [
            { id: 'c', day: day('2026-11-25'), completedAt: new Date() },
          ],
        }),
      );
      await expect(service.undoComplete('t')).rejects.toThrow(
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
