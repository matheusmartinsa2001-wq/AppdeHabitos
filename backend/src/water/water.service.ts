import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { brasiliaNow } from '../common/utils/brasilia';
import type { CreateReminderDto } from './dto/create-reminder.dto';
import type { UpdateReminderDto } from './dto/update-reminder.dto';
import type {
  WaterReminderDto,
  WaterSettingsDto,
} from './dto/water-settings.dto';
import { ReminderCache } from './reminder-cache';
import { WaterRepository } from './water.repository';
import { minuteOfDayToTime, timeToMinuteOfDay } from './water.rules';

/**
 * Configuração do módulo Água: meta diária (com histórico por dia) e lembretes
 * (iguais todos os dias). Regras em docs/regras-negocio.md → Módulo Água.
 */
@Injectable()
export class WaterService {
  constructor(
    private readonly repository: WaterRepository,
    private readonly clock: Clock,
    private readonly reminderCache: ReminderCache,
  ) {}

  async getSettings(): Promise<WaterSettingsDto> {
    const { today } = brasiliaNow(this.clock.now());
    const [goal, reminders] = await Promise.all([
      this.repository.findGoalForDay(today),
      this.repository.listActiveReminders(),
    ]);
    const remindersTotalMl = reminders.reduce((sum, r) => sum + r.amountMl, 0);
    return {
      goalMl: goal?.goalMl ?? null,
      goalEffectiveFrom: goal
        ? goal.effectiveFrom.toISOString().slice(0, 10)
        : null,
      reminders: reminders.map((r) => this.toReminderDto(r)),
      remindersTotalMl,
      remindersShortfallMl: goal
        ? Math.max(0, goal.goalMl - remindersTotalMl)
        : null,
    };
  }

  /** A nova meta vale já para hoje; dias anteriores mantêm a meta deles. */
  async setGoal(goalMl: number): Promise<WaterSettingsDto> {
    const { today } = brasiliaNow(this.clock.now());
    await this.repository.upsertGoal(today, goalMl);
    return this.getSettings();
  }

  async createReminder(dto: CreateReminderDto): Promise<WaterReminderDto> {
    const minuteOfDay = timeToMinuteOfDay(dto.time);
    await this.ensureTimeIsFree(minuteOfDay);
    const reminder = await this.repository.createReminder(
      minuteOfDay,
      dto.amountMl,
    );
    this.reminderCache.invalidate();
    return this.toReminderDto(reminder);
  }

  async updateReminder(
    id: string,
    dto: UpdateReminderDto,
  ): Promise<WaterReminderDto> {
    const current = await this.findReminderOrFail(id);
    const minuteOfDay =
      dto.time !== undefined ? timeToMinuteOfDay(dto.time) : undefined;
    if (minuteOfDay !== undefined && minuteOfDay !== current.minuteOfDay) {
      await this.ensureTimeIsFree(minuteOfDay);
    }
    const reminder = await this.repository.updateReminder(id, {
      minuteOfDay,
      amountMl: dto.amountMl,
    });
    this.reminderCache.invalidate();
    return this.toReminderDto(reminder);
  }

  async deleteReminder(id: string): Promise<void> {
    await this.findReminderOrFail(id);
    await this.repository.softDeleteReminder(id);
    this.reminderCache.invalidate();
  }

  private async findReminderOrFail(id: string) {
    const reminder = await this.repository.findActiveReminder(id);
    if (!reminder) {
      throw new NotFoundException('Lembrete não encontrado');
    }
    return reminder;
  }

  private async ensureTimeIsFree(minuteOfDay: number): Promise<void> {
    if (await this.repository.findActiveReminderAt(minuteOfDay)) {
      throw new ConflictException(
        `Já existe um lembrete às ${minuteOfDayToTime(minuteOfDay)}`,
      );
    }
  }

  private toReminderDto(reminder: {
    id: string;
    minuteOfDay: number;
    amountMl: number;
  }): WaterReminderDto {
    return {
      id: reminder.id,
      time: minuteOfDayToTime(reminder.minuteOfDay),
      amountMl: reminder.amountMl,
    };
  }
}
