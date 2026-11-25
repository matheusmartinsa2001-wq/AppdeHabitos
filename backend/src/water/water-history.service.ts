import { Injectable } from '@nestjs/common';
import { Clock } from '../common/services/clock.service';
import { brasiliaNow, toDayString } from '../common/utils/brasilia';
import type {
  WaterDayStatus,
  WaterHistoryDayDto,
  WaterHistoryDto,
} from './dto/water-history.dto';
import { WaterRepository } from './water.repository';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Acompanhamento macro (Etapa 10): calendário do mês (verde/vermelho), sequência e percentual.
 * Regras em docs/regras-negocio.md → Módulo Água → Acompanhamento macro:
 * - o calendário começa no dia da primeira meta;
 * - cada dia é avaliado pela meta que valia nele; batida = total ≥ meta;
 * - hoje fica neutro até a meia-noite (Brasília).
 */
@Injectable()
export class WaterHistoryService {
  constructor(
    private readonly repository: WaterRepository,
    private readonly clock: Clock,
  ) {}

  async getMonth(month?: string): Promise<WaterHistoryDto> {
    const { today } = brasiliaNow(this.clock.now());
    const currentMonth = toDayString(today).slice(0, 7);
    const selected = month ?? currentMonth;

    const [year, monthIndex] = selected.split('-').map(Number);
    const monthStart = new Date(Date.UTC(year, monthIndex - 1, 1));
    const monthEnd = new Date(Date.UTC(year, monthIndex, 0));

    const goals = await this.repository.listGoalChanges();
    const firstDay = goals[0]?.effectiveFrom ?? null;
    const goalFor = (day: Date): number | null => {
      let goal: number | null = null;
      for (const change of goals) {
        if (change.effectiveFrom.getTime() <= day.getTime())
          goal = change.goalMl;
        else break;
      }
      return goal;
    };

    // Totais desde a primeira meta até hoje (para a sequência) — um usuário só, poucos dias.
    const totals = new Map<number, number>();
    if (firstDay) {
      for (const row of await this.repository.sumIntakesByDay(
        firstDay,
        today,
      )) {
        totals.set(row.day.getTime(), row.totalMl);
      }
    }
    const totalOn = (day: Date) => totals.get(day.getTime()) ?? 0;

    const statusOf = (day: Date): WaterDayStatus => {
      if (!firstDay || day < firstDay || day > today) return 'none';
      if (day.getTime() === today.getTime()) return 'today';
      const goal = goalFor(day);
      if (goal === null) return 'none';
      return totalOn(day) >= goal ? 'met' : 'missed';
    };

    const days: WaterHistoryDayDto[] = [];
    for (let t = monthStart.getTime(); t <= monthEnd.getTime(); t += DAY_MS) {
      const day = new Date(t);
      const status = statusOf(day);
      days.push({
        day: toDayString(day),
        status,
        goalMl: status === 'none' ? null : goalFor(day),
        totalMl: day <= today ? totalOn(day) : 0,
      });
    }

    const metDays = days.filter((d) => d.status === 'met').length;
    const evaluatedDays = days.filter(
      (d) => d.status === 'met' || d.status === 'missed',
    ).length;

    return {
      month: selected,
      days,
      metDays,
      evaluatedDays,
      percent:
        evaluatedDays > 0 ? Math.round((metDays / evaluatedDays) * 100) : null,
      currentStreak: this.currentStreak(today, firstDay, goalFor, totalOn),
      firstDay: firstDay ? toDayString(firstDay) : null,
      canGoBack: !!firstDay && monthStart.getTime() > firstDay.getTime(),
      canGoForward: selected < currentMonth,
    };
  }

  /** Dias seguidos batendo a meta até ontem; hoje entra se já bateu (sem esperar a meia-noite). */
  private currentStreak(
    today: Date,
    firstDay: Date | null,
    goalFor: (day: Date) => number | null,
    totalOn: (day: Date) => number,
  ): number {
    if (!firstDay) return 0;
    const reached = (day: Date) => {
      const goal = goalFor(day);
      return goal !== null && totalOn(day) >= goal;
    };
    let streak = reached(today) ? 1 : 0;
    for (
      let t = today.getTime() - DAY_MS;
      t >= firstDay.getTime();
      t -= DAY_MS
    ) {
      if (!reached(new Date(t))) break;
      streak += 1;
    }
    return streak;
  }
}
