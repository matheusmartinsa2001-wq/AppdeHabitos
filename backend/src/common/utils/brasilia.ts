/**
 * Datas no horário de Brasília (decisão do usuário: "hoje", a virada do dia e os
 * horários dos lembretes seguem Brasília, não o fuso do servidor).
 *
 * Dias de negócio são gravados como `date` (meia-noite UTC do dia de Brasília).
 */

const TIME_ZONE = 'America/Sao_Paulo';

export interface BrasiliaNow {
  /** Dia de hoje em Brasília, como meia-noite UTC (formato das colunas `date`). */
  today: Date;
  /** Minuto do dia em Brasília (0..1439), mesmo formato de `water_reminders.minuteOfDay`. */
  minuteOfDay: number;
}

export function brasiliaNow(now = new Date()): BrasiliaNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return {
    today: new Date(
      Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
    ),
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
