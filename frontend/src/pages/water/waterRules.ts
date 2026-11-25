/** Mesmos limites do backend (backend/src/water/water.rules.ts). */
export const GOAL_MIN_ML = 500
export const GOAL_MAX_ML = 10_000
export const REMINDER_MIN_ML = 50
export const REMINDER_MAX_ML = 2_000

/** Valor que aparece no campo antes da primeira meta (escolha do usuário). Só vale ao salvar. */
export const SUGGESTED_GOAL_ML = 4_000

/** Registro livre: mesmos limites do lembrete. */
export const INTAKE_MIN_ML = REMINDER_MIN_ML
export const INTAKE_MAX_ML = REMINDER_MAX_ML

/** Botões rápidos do registro livre (escolha do usuário). */
export const QUICK_AMOUNTS_ML = [200, 300, 500] as const

/** Passo dos botões − / + da meta. */
const GOAL_STEP_ML = 250

/** Arredonda para o próximo múltiplo de 250 na direção do toque, dentro dos limites. */
export function stepGoal(current: number, direction: 1 | -1): number {
  const next =
    direction > 0 ? Math.floor(current / GOAL_STEP_ML) * GOAL_STEP_ML + GOAL_STEP_ML : Math.ceil(current / GOAL_STEP_ML) * GOAL_STEP_ML - GOAL_STEP_ML
  return Math.max(GOAL_MIN_ML, Math.min(GOAL_MAX_ML, next))
}
