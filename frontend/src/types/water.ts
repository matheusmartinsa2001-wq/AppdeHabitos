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

export interface WaterTodayReminder {
  id: string
  time: string
  amountMl: number
  /** Registro de hoje que confirmou o lembrete; null = ainda não tomado */
  intakeId: string | null
}

export interface WaterIntake {
  id: string
  /** Hora do registro, em Brasília */
  time: string
  amountMl: number
  source: 'REMINDER' | 'MANUAL'
  /** Horário do lembrete confirmado (só quando source = REMINDER) */
  reminderTime: string | null
}

export interface WaterToday {
  /** Hoje em Brasília, YYYY-MM-DD */
  day: string
  goalMl: number | null
  totalMl: number
  /** Quanto falta para a meta (0 = batida); null sem meta */
  remainingMl: number | null
  goalReached: boolean | null
  remindersShortfallMl: number | null
  reminders: WaterTodayReminder[]
  /** Mais recente primeiro */
  intakes: WaterIntake[]
}
