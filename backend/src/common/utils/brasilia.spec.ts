import { brasiliaNow } from './brasilia';

describe('brasiliaNow', () => {
  it('perto da meia-noite UTC ainda é o dia anterior em Brasília', () => {
    // 02:30 UTC de 26/11 = 23:30 de 25/11 em Brasília (UTC-3)
    const result = brasiliaNow(new Date('2026-11-26T02:30:00Z'));
    expect(result.today.toISOString()).toBe('2026-11-25T00:00:00.000Z');
    expect(result.minuteOfDay).toBe(23 * 60 + 30);
  });

  it('o dia vira à meia-noite de Brasília (03:00 UTC)', () => {
    const result = brasiliaNow(new Date('2026-11-26T03:00:00Z'));
    expect(result.today.toISOString()).toBe('2026-11-26T00:00:00.000Z');
    expect(result.minuteOfDay).toBe(0);
  });
});
