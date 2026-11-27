import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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

  /** Tarefas ativas com horário que ainda podem avisar: recorrentes e avulsas de hoje em diante. */
  listWithTime(today: Date) {
    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        dueMinuteOfDay: { not: null },
        OR: [{ repeatDays: { not: null } }, { dueDate: { gte: today } }],
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        dueMinuteOfDay: true,
        repeatDays: true,
      },
    });
  }

  /** Concluída? Recorrente: no dia dado; avulsa (`day` = null): em qualquer dia. */
  async isDone(taskId: string, day: Date | null): Promise<boolean> {
    const completion = await this.prisma.taskCompletion.findFirst({
      where: day ? { taskId, day } : { taskId },
      select: { id: true },
    });
    return completion !== null;
  }

  /**
   * Marca que o lembrete da tarefa saiu hoje. Devolve `false` se já estava marcado
   * (único taskId+day): duas chamadas do cron ao mesmo tempo nunca enviam duas vezes.
   */
  async claimDispatch(taskId: string, day: Date): Promise<boolean> {
    try {
      await this.prisma.taskReminderDispatch.create({ data: { taskId, day } });
      return true;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Todas as tarefas, inclusive as excluídas, com as conclusões e a regra de dias de cada
   * época, para o histórico (um usuário só: poucas linhas).
   */
  listForHistory() {
    return this.prisma.task.findMany({
      select: {
        id: true,
        title: true,
        dueDate: true,
        repeatDays: true,
        createdAt: true,
        deletedAt: true,
        completions: { select: { day: true } },
        repeatChanges: {
          select: { effectiveFrom: true, repeatDays: true },
          orderBy: { effectiveFrom: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
