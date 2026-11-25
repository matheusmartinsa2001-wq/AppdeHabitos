import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ReminderInput } from '@/types/water'
import { extractErrorMessage } from '@/utils/errors'
import { reminderSchema } from './waterRules'

interface ReminderFormProps {
  /** Valores do lembrete sendo editado; vazio = novo lembrete. */
  initial?: ReminderInput
  submitLabel: string
  onSubmit: (input: ReminderInput) => Promise<void>
  onCancel?: () => void
  /** Prefixo dos ids dos campos (vários formulários na mesma tela). */
  idPrefix: string
}

/** Formulário de lembrete (horário + mL), usado para adicionar e para editar. */
export function ReminderForm({ initial, submitLabel, onSubmit, onCancel, idPrefix }: ReminderFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      time: initial?.time ?? '',
      amountMl: initial ? String(initial.amountMl) : '',
    },
  })

  const submit = async (input: ReminderInput) => {
    setSubmitError(null)
    try {
      await onSubmit(input)
      if (!initial) reset({ time: '', amountMl: '' })
    } catch (error) {
      setSubmitError(extractErrorMessage(error))
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-2">
      {/* Grade com colunas fixas: no Safari do iPhone o campo de horário tem largura e altura
          próprias e transbordava por baixo do campo de mL. */}
      <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-end gap-2">
        <div className="min-w-0">
          <label htmlFor={`${idPrefix}-time`} className="mb-1 block text-xs text-muted-foreground">
            Horário
          </label>
          <Input
            id={`${idPrefix}-time`}
            type="time"
            aria-invalid={errors.time ? true : undefined}
            className="block h-11 min-w-0 appearance-none text-left [&::-webkit-date-and-time-value]:text-left"
            {...register('time')}
          />
        </div>
        <div className="relative min-w-0">
          <label htmlFor={`${idPrefix}-amount`} className="mb-1 block text-xs text-muted-foreground">
            Quantidade em mL
          </label>
          <Input
            id={`${idPrefix}-amount`}
            inputMode="numeric"
            aria-invalid={errors.amountMl ? true : undefined}
            className="h-11 pr-10"
            {...register('amountMl')}
          />
          <span className="pointer-events-none absolute right-3 bottom-0 flex h-11 items-center text-sm text-muted-foreground">
            mL
          </span>
        </div>
      </div>
      {errors.time && <p className="text-xs text-destructive">{errors.time.message}</p>}
      {errors.amountMl && <p className="text-xs text-destructive">{errors.amountMl.message}</p>}
      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant={initial ? 'primary' : 'outline'} loading={isSubmitting} className="flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
