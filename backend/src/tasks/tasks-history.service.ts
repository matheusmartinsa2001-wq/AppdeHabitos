import { Injectable } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { brasiliaNow, toDayString } from '../common/utils/brasilia';
import type {
  TaskDayStatus,
  TaskHistoryItemDto,
  TasksHistoryDayDto,
  TasksHistoryDto,
} from './dto/tasks-history.dto';
import { TasksRepository } from './tasks.repository';
import { repeatsOn } from './tasks.rules';

const DAY_MS = 24 * 60 * 60 * 1000;

interface HistoryTask {
  id: string;
  title: string;
  dueDate: Date | null;
  repeatDays: number | null;
  createdAt: Date;
  deletedAt: Date | null;
  completions: { day: Date }[];
  repeatChanges: { effectiveFrom: Date; repeatDays: number }[];
}

/**
 * Histórico de Tarefas (Etapa 16): calendário do mês, sequência e percentual.
 * Regras em docs/regras-negocio.md → Módulo Tarefas → Histórico:
 * - o que era do dia: recorrentes que caíam nele (pela regra de dias que valia) e avulsas com
 *   aquela data; as sem data não entram;
 * - avulsa conta como feita se foi concluída até aquele dia;
 * - verde = tudo feito, vermelho = faltou algo, cinza = nada para o dia; hoje neutro;
 * - dias cinza não quebram nem contam na sequência e no percentual.
 */
@Injectable()
export class TasksHistoryService {
  constructor(
    private readonly repository: TasksRepository,
    private readonly clock: Clock,
  ) {}

  async getMonth(month?: string): Promise<TasksHistoryDto> {
    const { today } = brasiliaNow(this.clock.now());
    const currentMonth = toDayString(today).slice(0, 7);
    const selected = month ?? currentMonth;
    const [year, monthIndex] = selected.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, monthIndex - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthIndex, 0));

    const tasks: HistoryTask[] = await this.repository.listForHistory();
    const dayOf = (instant: Date) => brasiliaNow(instant).today.getTime();
    const firstDayTime = tasks.length
      ? Math.min(...tasks.map((t) => dayOf(t.createdAt)))
      : null;

    const completedOn = new Map<number, number>();
    for (const task of tasks) {
      for (const { day } of task.completions) {
        completedOn.set(
          day.getTime(),
          (completedOn.get(day.getTime()) ?? 0) + 1,
        );
      }
    }

    const plannedOn = (day: Date): TaskHistoryItemDto[] => {
      const time = day.getTime();
      const items: TaskHistoryItemDto[] = [];
      for (const task of tasks) {
        if (task.deletedAt && dayOf(task.deletedAt) <= time) continue;
        if (task.repeatDays !== null) {
          if (dayOf(task.createdAt) > time) continue;
          const rule = ruleOn(task, time);
          if (rule === null || !repeatsOn(rule, day)) continue;
          items.push({
            id: task.id,
            title: task.title,
            done: task.completions.some((c) => c.day.getTime() === time),
          });
        } else if (task.dueDate?.getTime() === time) {
          items.push({
            id: task.id,
            title: task.title,
            done: task.completions.some((c) => c.day.getTime() <= time),
          });
        }
      }
      return items;
    };

    const allDone = (items: TaskHistoryItemDto[]) =>
      items.length > 0 && items.every((item) => item.done);

    const statusOf = (
      day: Date,
      items: TaskHistoryItemDto[],
    ): TaskDayStatus => {
      const time = day.getTime();
      if (
        firstDayTime === null ||
        time < firstDayTime ||
        time > today.getTime()
      )
        return 'none';
      if (time === today.getTime()) return 'today';
      if (items.length === 0) return 'empty';
      return allDone(items) ? 'met' : 'missed';
    };

    const days: TasksHistoryDayDto[] = [];
    for (let t = monthStart.getTime(); t <= monthEnd.getTime(); t += DAY_MS) {
      const day = new Date(t);
      const inRange =
        firstDayTime !== null && t >= firstDayTime && t <= today.getTime();
      const planned = inRange ? plannedOn(day) : [];
      days.push({
        day: toDayString(day),
        status: statusOf(day, planned),
        completed: inRange ? (completedOn.get(t) ?? 0) : 0,
        planned,
      });
    }

    const metDays = days.filter((d) => d.status === 'met').length;
    const evaluatedDays = days.filter(
      (d) => d.status === 'met' || d.status === 'missed',
    ).length;

    // Sequência: hoje entra se já fez tudo; para trás, dias sem tarefa são pulados.
    let currentStreak = 0;
    if (firstDayTime !== null) {
      if (allDone(plannedOn(today))) currentStreak = 1;
      for (let t = today.getTime() - DAY_MS; t >= firstDayTime; t -= DAY_MS) {
        const items = plannedOn(new Date(t));
        if (items.length === 0) continue;
        if (!allDone(items)) break;
        currentStreak += 1;
      }
    }

    return {
      month: selected,
      days,
      metDays,
      evaluatedDays,
      percent:
        evaluatedDays > 0 ? Math.round((metDays / evaluatedDays) * 100) : null,
      currentStreak,
      firstDay:
        firstDayTime === null ? null : toDayString(new Date(firstDayTime)),
      canGoBack: firstDayTime !== null && monthStart.getTime() > firstDayTime,
      canGoForward: selected < currentMonth,
    };
  }
}

/** Dias que valiam para a recorrente no dia: a regra de maior `effectiveFrom` até ele. */
function ruleOn(task: HistoryTask, time: number): number | null {
  let rule: number | null = null;
  for (const change of task.repeatChanges) {
    if (change.effectiveFrom.getTime() <= time) rule = change.repeatDays;
    else break;
  }
  return rule;
}
