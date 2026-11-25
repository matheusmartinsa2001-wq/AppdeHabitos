export interface WaterReminder {
  id: string
  /** "HH:MM", horário de Brasília */
  time: string
  amountMl: number
}

export interface WaterSettings {
  /** Meta que vale hoje; null antes da primeira meta */
  goalMl: number | null
  goalEffectiveFrom: string | null
  /** Em ordem de horário */
  reminders: WaterReminder[]
  remindersTotalMl: number
  /** Quanto falta para os lembretes chegarem à meta (0 = chegam); null sem meta */
  remindersShortfallMl: number | null
}

export interface ReminderInput {
  time: string
  amountMl: number
}
