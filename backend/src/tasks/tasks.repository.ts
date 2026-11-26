import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface TaskData {
  title: string;
  dueDate: Date | null;
  dueMinuteOfDay: number | null;
}

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Tarefas ativas que aparecem nas listas: as não concluídas e as concluídas hoje. */
  listForLists(today: Date) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        OR: [
          { completions: { none: {} } },
          { completions: { some: { day: today } } },
        ],
      },
      include: { completions: true },
    });
  }

  findActive(id: string) {
    return this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: { completions: true },
    });
  }

  create(data: TaskData) {
    return this.prisma.task.create({ data });
  }

  update(id: string, data: Partial<TaskData>) {
    return this.prisma.task.update({ where: { id }, data });
  }

  softDelete(id: string) {
    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  createCompletion(taskId: string, day: Date) {
    return this.prisma.taskCompletion.create({ data: { taskId, day } });
  }

  deleteCompletion(id: string) {
    return this.prisma.taskCompletion.delete({ where: { id } });
  }
}
