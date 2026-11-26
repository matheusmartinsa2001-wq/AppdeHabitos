import { Injectable } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';

export interface CachedTaskReminder {
  id: string;
  title: string;
  /** Avulsa: o dia dela; recorrente: null. */
  dueDate: Date | null;
  minuteOfDay: number;
  /** Recorrente: dias da semana em bits; avulsa: null. */
  repeatDays: number | null;
}

/** Recarrega de qualquer jeito depois disso (segurança contra cache esquecido). */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

/**
 * Tarefas com horário em memória, para o disparo do cron (a cada minuto) não consultar o
 * banco toda vez, como o `ReminderCache` da Água: o Neon gratuito "dorme" sem uso. O
 * `TasksService` invalida o cache a cada mudança nas tarefas (um processo só no Render).
 */
@Injectable()
export class TaskReminderCache {
  private reminders: CachedTaskReminder[] | null = null;
  private loadedAt = 0;

  constructor(private readonly repository: TasksRepository) {}

  async get(today: Date, now = Date.now()): Promise<CachedTaskReminder[]> {
    if (!this.reminders || now - this.loadedAt > MAX_AGE_MS) {
      const rows = await this.repository.listWithTime(today);
      this.reminders = rows.map((row) => ({
        id: row.id,
        title: row.title,
        dueDate: row.dueDate,
        minuteOfDay: row.dueMinuteOfDay as number,
        repeatDays: row.repeatDays,
      }));
      this.loadedAt = now;
    }
    return this.reminders;
  }

  invalidate(): void {
    this.reminders = null;
  }
}
