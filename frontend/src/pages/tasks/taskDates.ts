/** Limite aprovado (docs/regras-negocio.md → Módulo Tarefas), igual ao do backend. */
export const TASK_TITLE_MAX = 120

/** "2026-11-26" + 1 → "2026-11-27" (dias de calendário, sem fuso). */
export function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return date.toISOString().slice(0, 10)
}

const shortDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

/** Data de uma tarefa em relação a hoje: "Hoje", "Amanhã", "Ontem" ou "sex., 28 de nov.". */
export function formatTaskDate(date: string, today: string): string {
  if (date === today) return 'Hoje'
  if (date === addDays(today, 1)) return 'Amanhã'
  if (date === addDays(today, -1)) return 'Ontem'
  return shortDate.format(new Date(`${date}T00:00:00Z`))
}
