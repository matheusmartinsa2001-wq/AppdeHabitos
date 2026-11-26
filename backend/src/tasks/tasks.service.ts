import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { brasiliaNow, toDayString } from '../common/utils/brasilia';
import { minuteOfDayToTime, timeToMinuteOfDay } from '../water/water.rules';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { TaskDto, TaskListsDto } from './dto/task-lists.dto';
import type { UpdateTaskDto } from './dto/update-task.dto';
import { TaskReminderCache } from './task-reminder-cache';
import { TasksRepository, type TaskData } from './tasks.repository';
import {
  bitsToWeekdays,
  parseDay,
  repeatsOn,
  weekdaysToBits,
} from './tasks.rules';

interface TaskRow {
  id: string;
  title: string;
  dueDate: Date | null;
  dueMinuteOfDay: number | null;
  repeatDays: number | null;
  createdAt: Date;
  /** Nas listas: só a de hoje. Em `findActive`: a mais recente. */
  completions: { id: string; day: Date; completedAt: Date }[];
}

/**
 * Tarefas (Etapas 13 e 14): avulsas e recorrentes — criar, editar, excluir, concluir e
 * desfazer — e as listas Hoje, Próximas, Atrasadas e Recorrentes.
 * Regras em docs/regras-negocio.md → Módulo Tarefas.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly repository: TasksRepository,
    private readonly clock: Clock,
    private readonly reminderCache: TaskReminderCache,
  ) {}

  async getLists(): Promise<TaskListsDto> {
    const today = this.today();
    const todayTime = today.getTime();
    const tasks: TaskRow[] = await this.repository.listForLists(today);
    const recurring = tasks.filter((t) => t.repeatDays !== null);
    const oneOff = tasks.filter((t) => t.repeatDays === null);
    const pending = oneOff.filter((t) => t.completions.length === 0);
    const doneToday = tasks
      .filter((t) => t.completions.length > 0)
      .sort(
        (a, b) =>
          a.completions[0].completedAt.getTime() -
          b.completions[0].completedAt.getTime(),
      );

    return {
      day: toDayString(today),
      today: [
        ...[
          ...pending.filter(
            (t) => !t.dueDate || t.dueDate.getTime() === todayTime,
          ),
          ...recurring.filter(
            (t) =>
              t.completions.length === 0 &&
              repeatsOn(t.repeatDays as number, today),
          ),
        ].sort(byTime),
        ...doneToday,
      ].map(toDto),
      upcoming: pending
        .filter((t) => t.dueDate && t.dueDate.getTime() > todayTime)
        .sort(byDateAndTime)
        .map(toDto),
      overdue: pending
        .filter((t) => t.dueDate && t.dueDate.getTime() < todayTime)
        .sort(byDateAndTime)
        .map(toDto),
      recurring: [...recurring].sort(byTime).map(toDto),
    };
  }

  async create(dto: CreateTaskDto): Promise<TaskListsDto> {
    const repeatDays = dto.repeat ? weekdaysToBits(dto.repeat) : null;
    if (repeatDays !== null && dto.date) {
      throw new BadRequestException(['Tarefa que se repete não tem data']);
    }
    const dueDate = this.parseDueDate(dto.date ?? null);
    await this.repository.create(
      {
        title: dto.title,
        dueDate,
        dueMinuteOfDay: this.parseDueTime(
          dto.time ?? null,
          dueDate !== null || repeatDays !== null,
        ),
        repeatDays,
      },
      this.today(),
    );
    this.reminderCache.invalidate();
    return this.getLists();
  }

  /**
   * Campo ausente não muda. Tirar a data de uma avulsa tira também o horário.
   * Avulsa não vira recorrente, nem o contrário.
   */
  async update(id: string, dto: UpdateTaskDto): Promise<TaskListsDto> {
    const task = await this.findTask(id);
    const recurring = task.repeatDays !== null;
    const data: Partial<TaskData> = {};
    if (dto.title !== undefined) data.title = dto.title;

    if (recurring) {
      if (dto.repeat === null) {
        throw new BadRequestException([
          'Uma tarefa que se repete não vira avulsa. Crie outra tarefa.',
        ]);
      }
      if (dto.date) {
        throw new BadRequestException(['Tarefa que se repete não tem data']);
      }
      if (dto.repeat !== undefined) {
        data.repeatDays = weekdaysToBits(dto.repeat);
      }
      if (dto.time !== undefined) {
        data.dueMinuteOfDay = this.parseDueTime(dto.time, true);
      }
    } else {
      if (dto.repeat) {
        throw new BadRequestException([
          'Uma tarefa avulsa não vira recorrente. Crie outra tarefa.',
        ]);
      }
      const dueDate =
        dto.date === undefined ? task.dueDate : this.parseDueDate(dto.date);
      if (dto.date !== undefined) data.dueDate = dueDate;
      if (dto.time !== undefined) {
        data.dueMinuteOfDay = this.parseDueTime(dto.time, dueDate !== null);
      } else if (!dueDate) {
        data.dueMinuteOfDay = null;
      }
    }

    await this.repository.update(id, data, this.today());
    this.reminderCache.invalidate();
    return this.getLists();
  }

  /** Exclusão lógica: vale de hoje em diante; o que já foi concluído continua no histórico. */
  async remove(id: string): Promise<TaskListsDto> {
    await this.findTask(id);
    await this.repository.softDelete(id);
    this.reminderCache.invalidate();
    return this.getLists();
  }

  /**
   * Conclui hoje. Avulsa: a qualquer momento (antes da data ou atrasada), uma vez só.
   * Recorrente: só a ocorrência de hoje.
   */
  async complete(id: string): Promise<TaskListsDto> {
    const task = await this.findTask(id);
    const today = this.today();
    const last = task.completions[0];
    if (task.repeatDays !== null) {
      if (!repeatsOn(task.repeatDays, today)) {
        throw new ConflictException('Esta tarefa não se repete hoje');
      }
      if (last && last.day.getTime() === today.getTime()) {
        throw new ConflictException('Esta tarefa já foi concluída hoje');
      }
    } else if (last) {
      throw new ConflictException('Esta tarefa já foi concluída');
    }
    await this.repository.createCompletion(id, today);
    return this.getLists();
  }

  /** Desfaz a conclusão, só no mesmo dia (dias passados não mudam). */
  async undoComplete(id: string): Promise<TaskListsDto> {
    const task = await this.findTask(id);
    const last = task.completions[0];
    const doneToday = last && last.day.getTime() === this.today().getTime();
    if (!doneToday) {
      throw new ConflictException(
        !last || task.repeatDays !== null
          ? 'Esta tarefa não foi concluída hoje'
          : 'Só dá para desfazer a conclusão no mesmo dia',
      );
    }
    await this.repository.deleteCompletion(last.id);
    return this.getLists();
  }

  private async findTask(id: string): Promise<TaskRow> {
    const task = await this.repository.findActive(id);
    if (!task) {
      throw new NotFoundException('Tarefa não encontrada');
    }
    return task;
  }

  /** A data é hoje ou futura: não se cria nem remarca uma tarefa já atrasada. */
  private parseDueDate(value: string | null): Date | null {
    if (value === null) return null;
    const day = parseDay(value);
    if (!day) {
      throw new BadRequestException(['Data inválida']);
    }
    if (day.getTime() < this.today().getTime()) {
      throw new BadRequestException(['A data não pode ser antes de hoje']);
    }
    return day;
  }

  /** Horário só com data (avulsa) ou com repetição (recorrente). */
  private parseDueTime(value: string | null, allowed: boolean) {
    if (value === null) return null;
    if (!allowed) {
      throw new BadRequestException([
        'Para ter horário, a tarefa precisa de data',
      ]);
    }
    return timeToMinuteOfDay(value);
  }

  private today(): Date {
    return brasiliaNow(this.clock.now()).today;
  }
}

/** Por horário (sem horário no fim); empate pela criação. */
function byTime(a: TaskRow, b: TaskRow): number {
  return (
    (a.dueMinuteOfDay ?? 1440) - (b.dueMinuteOfDay ?? 1440) ||
    a.createdAt.getTime() - b.createdAt.getTime()
  );
}

/** Por data e depois por horário. */
function byDateAndTime(a: TaskRow, b: TaskRow): number {
  return (
    (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0) || byTime(a, b)
  );
}

function toDto(task: TaskRow): TaskDto {
  return {
    id: task.id,
    title: task.title,
    date: task.dueDate ? toDayString(task.dueDate) : null,
    time:
      task.dueMinuteOfDay === null
        ? null
        : minuteOfDayToTime(task.dueMinuteOfDay),
    repeat: task.repeatDays === null ? null : bitsToWeekdays(task.repeatDays),
    done: task.completions.length > 0,
  };
}
