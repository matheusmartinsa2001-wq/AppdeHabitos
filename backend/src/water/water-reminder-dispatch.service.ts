import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { brasiliaNow } from '../common/utils/brasilia';
import { PushService } from '../push/push.service';
import { ReminderCache } from './reminder-cache';
import { WaterRepository } from './water.repository';
import { minuteOfDayToTime } from './water.rules';

/**
 * Até quantos minutos depois do horário o lembrete ainda é enviado. Cobre o atraso do cron
 * e o tempo de o servidor gratuito "acordar"; depois disso, não manda mais (seria tarde).
 */
export const DISPATCH_WINDOW_MINUTES = 10;

export interface DispatchResult {
  /** Horários dos lembretes notificados nesta chamada. */
  notified: string[];
}

/**
 * Disparo das notificações dos lembretes, chamado a cada minuto pelo cron externo.
 * Regras (docs/regras-negocio.md → Lembretes):
 * - uma única notificação por lembrete por dia, no horário (sem repetir);
 * - lembrete já marcado como "tomei" antes do horário não é notificado.
 */
@Injectable()
export class WaterReminderDispatchService {
  private readonly logger = new Logger(WaterReminderDispatchService.name);

  constructor(
    private readonly cache: ReminderCache,
    private readonly repository: WaterRepository,
    private readonly pushService: PushService,
    private readonly clock: Clock,
  ) {}

  async dispatchDue(): Promise<DispatchResult> {
    const now = this.clock.now();
    const { today, minuteOfDay } = brasiliaNow(now);

    const due = (await this.cache.get(now.getTime())).filter((reminder) => {
      const late = minuteOfDay - reminder.minuteOfDay;
      return late >= 0 && late <= DISPATCH_WINDOW_MINUTES;
    });

    const notified: string[] = [];
    for (const reminder of due) {
      // Marca primeiro: se outra chamada já marcou, não envia de novo.
      if (!(await this.repository.claimDispatch(reminder.id, today))) continue;
      if (await this.repository.findReminderIntakeOnDay(reminder.id, today)) {
        continue; // já tomou antes do horário
      }
      const time = minuteOfDayToTime(reminder.minuteOfDay);
      const result = await this.pushService.broadcast({
        title: 'Hora de beber água 💧',
        body: `Lembrete das ${time}: ${reminder.amountMl} mL`,
        url: '/agua', // abre direto o módulo Água, sem passar pela escolha
        tag: `agua-${reminder.id}`,
      });
      this.logger.log(
        `Lembrete das ${time}: ${result.sent} enviada(s), ${result.removed} inscrição(ões) expirada(s)`,
      );
      notified.push(time);
    }
    return { notified };
  }
}
