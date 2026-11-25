import { z } from 'zod'
import { formatMl } from '@/utils/format'

/** Mesmos limites do backend (backend/src/water/water.rules.ts). */
export const GOAL_MIN_ML = 500
export const GOAL_MAX_ML = 10_000
export const REMINDER_MIN_ML = 50
export const REMINDER_MAX_ML = 2_000

/** Valor que aparece no campo antes da primeira meta (escolha do usuário). Só vale ao salvar. */
export const SUGGESTED_GOAL_ML = 4_000

function mlField(min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, 'Digite a quantidade em mL')
    .regex(/^\d+$/, 'Use só números (em mL)')
    .transform(Number)
    .pipe(
      z
        .number()
        .min(min, `Use no mínimo ${formatMl(min)}`)
        .max(max, `Use no máximo ${formatMl(max)}`),
    )
}

/** Registro livre: mesmos limites do lembrete. */
export const INTAKE_MIN_ML = REMINDER_MIN_ML
export const INTAKE_MAX_ML = REMINDER_MAX_ML

/** Botões rápidos do registro livre (escolha do usuário). */
export const QUICK_AMOUNTS_ML = [200, 300, 500] as const

export const intakeSchema = z.object({ amountMl: mlField(INTAKE_MIN_ML, INTAKE_MAX_ML) })

export const goalSchema = z.object({ goalMl: mlField(GOAL_MIN_ML, GOAL_MAX_ML) })

export const reminderSchema = z.object({
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Escolha o horário'),
  amountMl: mlField(REMINDER_MIN_ML, REMINDER_MAX_ML),
})
