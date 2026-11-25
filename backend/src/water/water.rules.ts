/** Limites aprovados pelo usuário (docs/regras-negocio.md → Módulo Água, Etapa 7). */
export const GOAL_MIN_ML = 500;
export const GOAL_MAX_ML = 10_000;
export const REMINDER_MIN_ML = 50;
export const REMINDER_MAX_ML = 2_000;

/** "HH:MM" (00:00 a 23:59). */
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function timeToMinuteOfDay(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minuteOfDayToTime(minuteOfDay: number): string {
  const hours = Math.floor(minuteOfDay / 60);
  const minutes = minuteOfDay % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
