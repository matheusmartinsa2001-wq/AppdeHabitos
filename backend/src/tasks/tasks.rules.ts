/** Limites aprovados pelo usuário (docs/regras-negocio.md → Módulo Tarefas). */
export const TASK_TITLE_MAX = 120;

/** "AAAA-MM-DD". Se o dia existe é conferido em `parseDay`. */
export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "AAAA-MM-DD" → meia-noite UTC (formato das colunas `date`), ou null se o dia não existe. */
export function parseDay(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null;
  const day = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== value
    ? null
    : day;
}

/**
 * Dias de uma recorrente, guardados como bits: domingo (0) = 1, segunda (1) = 2 …
 * sábado (6) = 64. Todo dia = 127.
 */
export function weekdaysToBits(weekdays: number[]): number {
  return weekdays.reduce((bits, weekday) => bits | (1 << weekday), 0);
}

export function bitsToWeekdays(bits: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].filter((weekday) => bits & (1 << weekday));
}

/** A recorrente cai neste dia (coluna `date`, meia-noite UTC do dia de Brasília)? */
export function repeatsOn(bits: number, day: Date): boolean {
  return (bits & (1 << day.getUTCDay())) !== 0;
}
