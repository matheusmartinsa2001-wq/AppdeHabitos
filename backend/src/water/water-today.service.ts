import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import {
  brasiliaNow,
  brasiliaTime,
  toDayString,
} from '../common/utils/brasilia';
import type { WaterTodayDto } from './dto/water-today.dto';
import { WaterRepository } from './water.repository';
import { minuteOfDayToTime } from './water.rules';

/**
 * Água do dia (Etapa 8): o que já foi bebido hoje, quanto falta para a meta, "tomei" nos
 * lembretes e registro livre. Só o dia de hoje (Brasília) pode ser alterado.
 * Regras em docs/regras-negocio.md → Módulo Água.
 */
@Injectable()
export class WaterTodayService {
  constructor(
    private readonly repository: WaterRepository,
    private readonly clock: Clock,
  ) {}

  async getToday(): Promise<WaterTodayDto> {
    const today = this.today();
    const [goal, reminders, intakes] = await Promise.all([
      this.repository.findGoalForDay(today),
      this.repository.listActiveReminders(),
      this.repository.listIntakesForDay(today),
    ]);

    const totalMl = intakes.reduce((sum, i) => sum + i.amountMl, 0);
    const remindersTotalMl = reminders.reduce((sum, r) => sum + r.amountMl, 0);
    const intakeByReminder = new Map(
      intakes
        .filter((i) => i.reminderId)
        .map((i) => [i.reminderId as string, i.id]),
    );

    return {
      day: toDayString(today),
      goalMl: goal?.goalMl ?? null,
      totalMl,
      remainingMl: goal ? Math.max(0, goal.goalMl - totalMl) : null,
      goalReached: goal ? totalMl >= goal.goalMl : null,
      remindersShortfallMl: goal
        ? Math.max(0, goal.goalMl - remindersTotalMl)
        : null,
      reminders: reminders.map((r) => ({
        id: r.id,
        time: minuteOfDayToTime(r.minuteOfDay),
        amountMl: r.amountMl,
        intakeId: intakeByReminder.get(r.id) ?? null,
      })),
      intakes: intakes.map((i) => ({
        id: i.id,
        time: brasiliaTime(i.createdAt),
        amountMl: i.amountMl,
        source: i.source,
        reminderTime: i.reminder
          ? minuteOfDayToTime(i.reminder.minuteOfDay)
          : null,
      })),
    };
  }

  /** "Tomei": soma a quantidade do lembrete. Uma vez por dia; pode ser antes do horário. */
  async confirmReminder(reminderId: string): Promise<WaterTodayDto> {
    const today = this.today();
    const reminder = await this.repository.findActiveReminder(reminderId);
    if (!reminder) {
      throw new NotFoundException('Lembrete não encontrado');
    }
    if (await this.repository.findReminderIntakeOnDay(reminderId, today)) {
      throw new ConflictException(
        `O lembrete das ${minuteOfDayToTime(reminder.minuteOfDay)} já foi marcado hoje`,
      );
    }
    await this.repository.createIntake({
      day: today,
      amountMl: reminder.amountMl,
      source: 'REMINDER',
      reminderId,
    });
    return this.getToday();
  }

  /** Registro livre, a qualquer hora, sempre no dia de hoje. */
  async addIntake(amountMl: number): Promise<WaterTodayDto> {
    await this.repository.createIntake({
      day: this.today(),
      amountMl,
      source: 'MANUAL',
    });
    return this.getToday();
  }

  /** Desfazer um registro feito por engano — só do dia de hoje. */
  async deleteIntake(id: string): Promise<WaterTodayDto> {
    const intake = await this.repository.findIntake(id);
    if (!intake) {
      throw new NotFoundException('Registro não encontrado');
    }
    if (intake.day.getTime() !== this.today().getTime()) {
      throw new ConflictException(
        'Registros de dias anteriores não podem ser alterados',
      );
    }
    await this.repository.deleteIntake(id);
    return this.getToday();
  }

  private today(): Date {
    return brasiliaNow(this.clock.now()).today;
  }
}
