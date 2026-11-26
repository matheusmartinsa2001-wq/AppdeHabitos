import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { brasiliaNow } from '../common/utils/brasilia';
import { PushService } from '../push/push.service';
import { DISPATCH_WINDOW_MINUTES } from '../water/water-reminder-dispatch.service';
import { minuteOfDayToTime } from '../water/water.rules';
import { TaskReminderCache } from './task-reminder-cache';
import { TasksRepository } from './tasks.repository';
import { repeatsOn } from './tasks.rules';

/**
 * Lembretes das tarefas (Etapa 15), no mesmo disparo de cada minuto da Água.
 * Regras (docs/regras-negocio.md → Módulo Tarefas → Lembrete):
 * - só tarefa com horário: a avulsa no dia dela, a recorrente nos dias escolhidos;
 * - uma notificação por tarefa por dia, no horário, até 10 minutos de atraso, sem repetir;
 * - não sai se a tarefa (ou a ocorrência de hoje) já foi concluída.
 */
@Injectable()
export class TaskReminderDispatchService {
  private readonly logger = new Logger(TaskReminderDispatchService.name);

  constructor(
    private readonly cache: TaskReminderCache,
    private readonly repository: TasksRepository,
    private readonly pushService: PushService,
    private readonly clock: Clock,
  ) {}

  /** Devolve "HH:MM título" de cada tarefa notificada nesta chamada. */
  async dispatchDue(): Promise<string[]> {
    const now = this.clock.now();
    const { today, minuteOfDay } = brasiliaNow(now);

    const due = (await this.cache.get(today, now.getTime())).filter((task) => {
      const late = minuteOfDay - task.minuteOfDay;
      const isToday =
        task.repeatDays !== null
          ? repeatsOn(task.repeatDays, today)
          : task.dueDate?.getTime() === today.getTime();
      return isToday && late >= 0 && late <= DISPATCH_WINDOW_MINUTES;
    });

    const notified: string[] = [];
    for (const task of due) {
      // Marca primeiro: se outra chamada já marcou, não envia de novo.
      if (!(await this.repository.claimDispatch(task.id, today))) continue;
      const recurring = task.repeatDays !== null;
      if (await this.repository.isDone(task.id, recurring ? today : null)) {
        continue; // já concluída antes do horário
      }
      const time = minuteOfDayToTime(task.minuteOfDay);
      const result = await this.pushService.broadcast({
        title: `Tarefa: ${task.title}`,
        body: `às ${time}`,
        url: '/tarefas', // abre direto o módulo Tarefas
        tag: `tarefa-${task.id}`,
      });
      this.logger.log(
        `Tarefa das ${time}: ${result.sent} enviada(s), ${result.removed} inscrição(ões) expirada(s)`,
      );
      notified.push(`${time} ${task.title}`);
    }
    return notified;
  }
}
