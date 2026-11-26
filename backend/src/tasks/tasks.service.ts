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
import { TasksRepository, type TaskData } from './tasks.repository';
import { parseDay } from './tasks.rules';

interface TaskRow {
  id: string;
  title: string;
  dueDate: Date | null;
  dueMinuteOfDay: number | null;
  createdAt: Date;
  completions: { id: string; day: Date; completedAt: Date }[];
}

/**
 * Tarefas avulsas (Etapa 13): criar, editar, excluir, concluir e desfazer, e as listas
 * Hoje, Próximas e Atrasadas. Regras em docs/regras-negocio.md → Módulo Tarefas.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly repository: TasksRepository,
    private readonly clock: Clock,
  ) {}

  async getLists(): Promise<TaskListsDto> {
    const today = this.today();
    const todayTime = today.getTime();
    const tasks: TaskRow[] = await this.repository.listForLists(today);
    const pending = tasks
      .filter((t) => t.completions.length === 0)
      .sort(byDateAndTime);
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
        ...pending.filter(
          (t) => !t.dueDate || t.dueDate.getTime() === todayTime,
        ),
        ...doneToday,
      ].map(toDto),
      upcoming: pending
        .filter((t) => t.dueDate && t.dueDate.getTime() > todayTime)
        .map(toDto),
      overdue: pending
        .filter((t) => t.dueDate && t.dueDate.getTime() < todayTime)
        .map(toDto),
    };
  }

  async create(dto: CreateTaskDto): Promise<TaskListsDto> {
    const dueDate = this.parseDueDate(dto.date ?? null);
    await this.repository.create({
      title: dto.title,
      dueDate,
      dueMinuteOfDay: this.parseDueTime(dto.time ?? null, dueDate),
    });
    return this.getLists();
  }

  /** Campo ausente não muda. Tirar a data tira também o horário. */
  async update(id: string, dto: UpdateTaskDto): Promise<TaskListsDto> {
    const task = await this.findTask(id);
    const data: Partial<TaskData> = {};
    if (dto.title !== undefined) data.title = dto.title;

    const dueDate =
      dto.date === undefined ? task.dueDate : this.parseDueDate(dto.date);
    if (dto.date !== undefined) data.dueDate = dueDate;
    if (dto.time !== undefined) {
      data.dueMinuteOfDay = this.parseDueTime(dto.time, dueDate);
    } else if (!dueDate) {
      data.dueMinuteOfDay = null;
    }

    await this.repository.update(id, data);
    return this.getLists();
  }

  /** Exclusão lógica: a conclusão continua contando no histórico. */
  async remove(id: string): Promise<TaskListsDto> {
    await this.findTask(id);
    await this.repository.softDelete(id);
    return this.getLists();
  }

  /** Conclui hoje. Pode ser antes da data ou já atrasada; uma vez só. */
  async complete(id: string): Promise<TaskListsDto> {
    const task = await this.findTask(id);
    if (task.completions.length > 0) {
      throw new ConflictException('Esta tarefa já foi concluída');
    }
    await this.repository.createCompletion(id, this.today());
    return this.getLists();
  }

  /** Desfaz a conclusão, só no mesmo dia (dias passados não mudam). */
  async undoComplete(id: string): Promise<TaskListsDto> {
    const task = await this.findTask(id);
    const completion = task.completions[0];
    if (!completion) {
      throw new ConflictException('Esta tarefa não está concluída');
    }
    if (completion.day.getTime() !== this.today().getTime()) {
      throw new ConflictException(
        'Só dá para desfazer a conclusão no mesmo dia',
      );
    }
    await this.repository.deleteCompletion(completion.id);
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

  private parseDueTime(value: string | null, dueDate: Date | null) {
    if (value === null) return null;
    if (!dueDate) {
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

/** Por data (sem data no fim) e horário (sem horário depois); empate pela criação. */
function byDateAndTime(a: TaskRow, b: TaskRow): number {
  return (
    (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity) ||
    (a.dueMinuteOfDay ?? 1440) - (b.dueMinuteOfDay ?? 1440) ||
    a.createdAt.getTime() - b.createdAt.getTime()
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
    done: task.completions.length > 0,
  };
}
