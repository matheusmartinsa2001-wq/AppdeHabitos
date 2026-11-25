import { Injectable } from '@nestjs/common';
import type { WaterIntakeSource } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WaterRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Meta que vale no dia: a de maior `effectiveFrom` até esse dia. */
  findGoalForDay(day: Date) {
    return this.prisma.waterGoalChange.findFirst({
      where: { effectiveFrom: { lte: day } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  /** Uma linha por dia de vigência: mudar a meta de novo no mesmo dia só atualiza. */
  upsertGoal(effectiveFrom: Date, goalMl: number) {
    return this.prisma.waterGoalChange.upsert({
      where: { effectiveFrom },
      create: { effectiveFrom, goalMl },
      update: { goalMl },
    });
  }

  listActiveReminders() {
    return this.prisma.waterReminder.findMany({
      where: { deletedAt: null },
      orderBy: { minuteOfDay: 'asc' },
    });
  }

  findActiveReminder(id: string) {
    return this.prisma.waterReminder.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findActiveReminderAt(minuteOfDay: number) {
    return this.prisma.waterReminder.findFirst({
      where: { minuteOfDay, deletedAt: null },
    });
  }

  createReminder(minuteOfDay: number, amountMl: number) {
    return this.prisma.waterReminder.create({
      data: { minuteOfDay, amountMl },
    });
  }

  updateReminder(
    id: string,
    data: { minuteOfDay?: number; amountMl?: number },
  ) {
    return this.prisma.waterReminder.update({ where: { id }, data });
  }

  listIntakesForDay(day: Date) {
    return this.prisma.waterIntake.findMany({
      where: { day },
      orderBy: { createdAt: 'desc' },
      include: { reminder: { select: { minuteOfDay: true } } },
    });
  }

  findIntake(id: string) {
    return this.prisma.waterIntake.findUnique({ where: { id } });
  }

  findReminderIntakeOnDay(reminderId: string, day: Date) {
    return this.prisma.waterIntake.findFirst({ where: { reminderId, day } });
  }

  createIntake(data: {
    day: Date;
    amountMl: number;
    source: WaterIntakeSource;
    reminderId?: string;
  }) {
    return this.prisma.waterIntake.create({ data });
  }

  deleteIntake(id: string) {
    return this.prisma.waterIntake.delete({ where: { id } });
  }

  /** Exclusão lógica: registros antigos continuam apontando para o lembrete. */
  softDeleteReminder(id: string) {
    return this.prisma.waterReminder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
