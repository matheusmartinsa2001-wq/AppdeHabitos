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

const monthYear = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** "2026-11" → "novembro de 2026" */
export function formatMonthYear(month: string): string {
  return monthYear.format(new Date(`${month}-01T00:00:00Z`))
}

/** "2026-11" → "2026-10" (delta = -1) */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  return date.toISOString().slice(0, 7)
}

/** 2500 → "2.500 mL" */
export function formatMl(value: number): string {
  return `${integer.format(value)} mL`
}
