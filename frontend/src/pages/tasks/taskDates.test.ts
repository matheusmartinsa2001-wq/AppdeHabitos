import { describe, expect, it } from 'vitest'
import { addDays, formatRepeat, formatTaskDate } from './taskDates'

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

  it('dias de uma recorrente', () => {
    expect(formatRepeat([0, 1, 2, 3, 4, 5, 6])).toBe('Todo dia')
    expect(formatRepeat([1, 3, 5])).toBe('seg · qua · sex')
  })
})
