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
