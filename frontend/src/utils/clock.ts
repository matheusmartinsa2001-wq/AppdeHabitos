/** Hora atual em Brasília (lembretes e "agora" seguem Brasília, não o fuso do aparelho). */
export function brasiliaMinuteOfDay(now = new Date()): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>
  return Number(parts.hour) * 60 + Number(parts.minute)
}

export function timeToMinute(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function minuteToTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}

/** "em 25 min", "há 1 h 10 min", "agora" — distância de um horário até agora. */
export function relativeTime(time: string, nowMinute: number): string {
  const diff = timeToMinute(time) - nowMinute
  if (diff === 0) return 'agora'
  const abs = Math.abs(diff)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  const text = hours ? (minutes ? `${hours} h ${minutes} min` : `${hours} h`) : `${minutes} min`
  return diff > 0 ? `em ${text}` : `há ${text}`
}

/** Animações mais calmas quando o sistema pede menos movimento. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/** Hoje em Brasília, "YYYY-MM-DD". */
export function brasiliaToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
