import { Injectable } from '@nestjs/common';
import { WaterRepository } from './water.repository';

export interface CachedReminder {
  id: string;
  minuteOfDay: number;
  amountMl: number;
}

/** Recarrega de qualquer jeito depois disso (segurança contra cache esquecido). */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * Lembretes ativos em memória, para o disparo do cron (a cada minuto) não consultar o
 * banco toda vez: o Neon gratuito "dorme" sem uso e tem limite de horas de computação.
 * O banco só é consultado quando algum lembrete está no horário. O `WaterService`
 * invalida o cache a cada mudança nos lembretes (um processo só no Render).
 */
@Injectable()
export class ReminderCache {
  private reminders: CachedReminder[] | null = null;
  private loadedAt = 0;

  constructor(private readonly repository: WaterRepository) {}

  async get(now = Date.now()): Promise<CachedReminder[]> {
    if (!this.reminders || now - this.loadedAt > MAX_AGE_MS) {
      const rows = await this.repository.listActiveReminders();
      this.reminders = rows.map(({ id, minuteOfDay, amountMl }) => ({
        id,
        minuteOfDay,
        amountMl,
      }));
      this.loadedAt = now;
    }
    return this.reminders;
  }

  invalidate(): void {
    this.reminders = null;
  }
}
