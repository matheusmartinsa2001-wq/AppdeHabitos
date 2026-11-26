import { describe, expect, it } from 'vitest'
import { addDays, formatTaskDate } from './taskDates'

describe('taskDates', () => {
  it('soma dias atravessando o mês', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-01', -1)).toBe('2026-11-30')
  })

  it('data relativa a hoje', () => {
    expect(formatTaskDate('2026-11-26', '2026-11-26')).toBe('Hoje')
    expect(formatTaskDate('2026-11-27', '2026-11-26')).toBe('Amanhã')
    expect(formatTaskDate('2026-11-25', '2026-11-26')).toBe('Ontem')
    expect(formatTaskDate('2026-11-28', '2026-11-26')).toMatch(/sáb.*28.*nov/)
  })
})
