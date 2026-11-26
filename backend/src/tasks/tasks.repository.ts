import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface TaskData {
  title: string;
  dueDate: Date | null;
  dueMinuteOfDay: number | null;
  repeatDays: number | null;
}

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tarefas ativas que podem aparecer nas listas: as recorrentes, as avulsas não concluídas
   * e as concluídas hoje. Traz só a conclusão de hoje (avulsa fora dela = não concluída).
   */
  listForLists(today: Date) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        OR: [
          { repeatDays: { not: null } },
          { completions: { none: {} } },
          { completions: { some: { day: today } } },
        ],
      },
      include: { completions: { where: { day: today } } },
    });
  }

  findActive(id: string) {
    return this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: { completions: { orderBy: { day: 'desc' }, take: 1 } },
    });
  }

  /** Recorrente: grava também os dias a partir de hoje, na mesma transação. */
  create(data: TaskData, today: Date) {
    return this.prisma.task.create({
      data: {
        ...data,
        repeatChanges:
          data.repeatDays === null
            ? undefined
            : {
                create: { effectiveFrom: today, repeatDays: data.repeatDays },
              },
      },
    });
  }

  /** Mudar os dias de uma recorrente cria (ou atualiza) a regra que vale a partir de hoje. */
  update(id: string, data: Partial<TaskData>, today: Date) {
    const { repeatDays } = data;
    if (repeatDays === undefined || repeatDays === null) {
      return this.prisma.task.update({ where: { id }, data });
    }
    return this.prisma.$transaction([
      this.prisma.task.update({ where: { id }, data }),
      this.prisma.taskRepeatChange.upsert({
        where: { taskId_effectiveFrom: { taskId: id, effectiveFrom: today } },
        create: { taskId: id, effectiveFrom: today, repeatDays },
        update: { repeatDays },
      }),
    ]);
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
