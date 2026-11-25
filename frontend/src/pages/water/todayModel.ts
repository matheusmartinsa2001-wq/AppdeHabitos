import type { WaterToday, WaterTodayReminder } from '@/types/water'
import { relativeTime, timeToMinute } from '@/utils/clock'

/**
 * Lembrete "da vez": o último pendente que já passou do horário; se nenhum passou, o
 * próximo pendente. Null quando todos foram tomados (ou não há lembretes).
 */
export function nextReminder(reminders: WaterTodayReminder[], nowMinute: number): WaterTodayReminder | null {
  const pending = reminders.filter((r) => !r.intakeId).sort((a, b) => a.time.localeCompare(b.time))
  if (!pending.length) return null
  const past = pending.filter((r) => timeToMinute(r.time) <= nowMinute)
  return past.length ? past[past.length - 1] : pending[0]
}

export type TimelineRow =
  | { kind: 'now'; key: string; time: string }
  | {
      kind: 'done'
      key: string
      /** Horário da linha: o do lembrete, ou a hora do registro livre. */
      time: string
      amountMl: number
      sub: string
      intakeId: string
      fromReminder: boolean
    }
  | {
      kind: 'pending'
      key: string
      time: string
      amountMl: number
      sub: string
      reminderId: string
      isNext: boolean
      late: boolean
    }

/**
 * "Seu dia": lembretes e registros numa linha só, em ordem de horário, com a marca de "agora".
 * Um lembrete tomado aparece uma vez (no horário dele), não duas.
 */
export function buildTimeline(today: WaterToday, nowMinute: number, nowTime: string): TimelineRow[] {
  const next = nextReminder(today.reminders, nowMinute)
  const items: Exclude<TimelineRow, { kind: 'now' }>[] = []

  for (const intake of today.intakes) {
    const fromReminder = intake.source === 'REMINDER'
    items.push({
      kind: 'done',
      key: intake.id,
      time: intake.reminderTime ?? intake.time,
      amountMl: intake.amountMl,
      sub: fromReminder ? `Lembrete · tomado às ${intake.time}` : 'Registro livre',
      intakeId: intake.id,
      fromReminder,
    })
  }
  for (const reminder of today.reminders) {
    if (reminder.intakeId) continue
    const late = timeToMinute(reminder.time) < nowMinute
    const isNext = next?.id === reminder.id
    items.push({
      kind: 'pending',
      key: reminder.id,
      time: reminder.time,
      amountMl: reminder.amountMl,
      sub: isNext
        ? `Lembrete · ${relativeTime(reminder.time, nowMinute)}`
        : late
          ? 'Lembrete · não marcado'
          : 'Lembrete',
      reminderId: reminder.id,
      isNext,
      late,
    })
  }
  if (!items.length) return []

  items.sort((a, b) => a.time.localeCompare(b.time) || (a.kind === 'done' ? -1 : 1))

  const rows: TimelineRow[] = []
  let nowPlaced = false
  for (const item of items) {
    if (!nowPlaced && timeToMinute(item.time) > nowMinute) {
      rows.push({ kind: 'now', key: 'now', time: nowTime })
      nowPlaced = true
    }
    rows.push(item)
  }
  if (!nowPlaced) rows.push({ kind: 'now', key: 'now', time: nowTime })
  return rows
}
