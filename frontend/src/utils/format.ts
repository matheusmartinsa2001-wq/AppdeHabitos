const integer = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** 2500 → "2.500 mL" */
export function formatMl(value: number): string {
  return `${integer.format(value)} mL`
}
