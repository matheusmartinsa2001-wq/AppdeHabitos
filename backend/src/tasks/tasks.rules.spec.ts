import {
  bitsToWeekdays,
  parseDay,
  repeatsOn,
  weekdaysToBits,
} from './tasks.rules';

describe('tasks.rules', () => {
  it('dias da semana ↔ bits (domingo = 1 … sábado = 64)', () => {
    expect(weekdaysToBits([0])).toBe(1);
    expect(weekdaysToBits([6])).toBe(64);
    expect(weekdaysToBits([0, 1, 2, 3, 4, 5, 6])).toBe(127);
    expect(bitsToWeekdays(42)).toEqual([1, 3, 5]);
  });

  it('repeatsOn usa o dia da semana da data', () => {
    // 26/11/2026 é quinta (4).
    expect(repeatsOn(1 << 4, new Date('2026-11-26T00:00:00Z'))).toBe(true);
    expect(repeatsOn(1 << 4, new Date('2026-11-27T00:00:00Z'))).toBe(false);
  });

  it('parseDay recusa dia que não existe', () => {
    expect(parseDay('2026-11-26')).toEqual(new Date('2026-11-26T00:00:00Z'));
    expect(parseDay('2026-02-30')).toBeNull();
    expect(parseDay('26/11/2026')).toBeNull();
  });
});
