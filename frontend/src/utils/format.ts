const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

const weekdayDate = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

/** "2026-11-25" → "quarta-feira, 25 de novembro" (dia de calendário, sem fuso). */
export function formatDayLong(day: string): string {
  return weekdayDate.format(new Date(`${day}T00:00:00Z`))
}

/** 2500 → "2.500 mL" */
export function formatMl(value: number): string {
  return `${integer.format(value)} mL`
}
