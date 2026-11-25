import { describe, expect, it } from 'vitest'
import type { WaterToday } from '@/types/water'
import { buildTimeline, nextReminder } from './todayModel'
import { stepGoal } from './waterRules'

const at = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

const reminders = [
  { id: 'r8', time: '08:00', amountMl: 500, intakeId: 'i8' },
  { id: 'r10', time: '10:00', amountMl: 500, intakeId: null },
  { id: 'r14', time: '14:00', amountMl: 500, intakeId: null },
  { id: 'r16', time: '16:00', amountMl: 500, intakeId: null },
]

describe('nextReminder (lembrete da vez)', () => {
  it('o último pendente que já passou do horário', () => {
    expect(nextReminder(reminders, at('14:30'))?.id).toBe('r14')
  })

  it('se nenhum pendente passou, o próximo', () => {
    expect(nextReminder(reminders, at('09:00'))?.id).toBe('r10')
  })

  it('todos tomados: nenhum', () => {
    expect(nextReminder([{ ...reminders[0] }], at('12:00'))).toBeNull()
  })
})

describe('buildTimeline (Seu dia)', () => {
  const today: WaterToday = {
    day: '2026-11-25',
    goalMl: 3000,
    totalMl: 800,
    remainingMl: 2200,
    goalReached: false,
    remindersShortfallMl: 1000,
    reminders,
    intakes: [
      { id: 'i11', time: '11:10', amountMl: 300, source: 'MANUAL', reminderTime: null },
      { id: 'i8', time: '08:04', amountMl: 500, source: 'REMINDER', reminderTime: '08:00' },
    ],
  }

  it('lembrete tomado aparece uma vez só, no horário dele; "agora" entra no lugar certo', () => {
    const rows = buildTimeline(today, at('13:35'), '13:35')
    expect(rows.map((row) => `${row.kind}:${row.time}`)).toEqual([
      'done:08:00',
      'pending:10:00',
      'done:11:10',
      'now:13:35',
      'pending:14:00',
      'pending:16:00',
    ])
  })

  it('textos de cada linha: tomado às, livre e o da vez (atrasado)', () => {
    const rows = buildTimeline(today, at('13:35'), '13:35')
    const subs = rows.flatMap((row) => (row.kind === 'now' ? [] : [row.sub]))
    expect(subs).toEqual([
      'Lembrete · tomado às 08:04',
      // O 10:00 passou sem ser marcado: ele é o "da vez".
      'Lembrete · há 3 h 35 min',
      'Registro livre',
      'Lembrete',
      'Lembrete',
    ])
  })

  it('lembrete atrasado que não é o da vez aparece como "não marcado"', () => {
    const rows = buildTimeline(today, at('14:30'), '14:30')
    const subs = rows.flatMap((row) => (row.kind === 'pending' ? [`${row.time} ${row.sub}`] : []))
    expect(subs).toEqual(['10:00 Lembrete · não marcado', '14:00 Lembrete · há 30 min', '16:00 Lembrete'])
  })

  it('sem lembretes nem registros: vazio', () => {
    expect(buildTimeline({ ...today, reminders: [], intakes: [] }, at('10:00'), '10:00')).toEqual([])
  })
})

describe('stepGoal (− / + de 250 mL)', () => {
  it('vai para o múltiplo de 250 seguinte na direção do toque', () => {
    expect(stepGoal(4000, 1)).toBe(4250)
    expect(stepGoal(4000, -1)).toBe(3750)
    expect(stepGoal(3100, 1)).toBe(3250)
    expect(stepGoal(3100, -1)).toBe(3000)
  })

  it('respeita os limites de 500 a 10.000 mL', () => {
    expect(stepGoal(500, -1)).toBe(500)
    expect(stepGoal(10_000, 1)).toBe(10_000)
  })
})
