import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { extractErrorMessage } from '@/utils/errors'
import { goalSchema, SUGGESTED_GOAL_ML } from './waterRules'

interface GoalFormProps {
  goalMl: number | null
  onSave: (goalMl: number) => Promise<void>
}

export function GoalForm({ goalMl, onSave }: GoalFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: { goalMl: String(goalMl ?? SUGGESTED_GOAL_ML) },
  })

  const onSubmit = async ({ goalMl: value }: { goalMl: number }) => {
    setSubmitError(null)
    setSaved(false)
    try {
      await onSave(value)
      setSaved(true)
    } catch (error) {
      setSubmitError(extractErrorMessage(error))
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-semibold">Meta diária</h2>
      {goalMl === null && (
        <p className="mt-1 text-sm text-muted-foreground">Você ainda não tem uma meta. Confira o valor e salve.</p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 flex flex-col gap-2">
        <label htmlFor="goalMl" className="sr-only">
          Meta diária em mL
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              id="goalMl"
              inputMode="numeric"
              aria-invalid={errors.goalMl ? true : undefined}
              className="pr-10"
              {...register('goalMl', { onChange: () => setSaved(false) })}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
              mL
            </span>
          </div>
          <Button type="submit" loading={isSubmitting}>
            Salvar
          </Button>
        </div>
        {errors.goalMl && <p className="text-xs text-destructive">{errors.goalMl.message}</p>}
        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-success">
            Meta salva.
          </p>
        )}
        <p className="text-xs text-muted-foreground">A nova meta já vale para hoje. Dias anteriores mantêm a meta deles.</p>
      </form>
    </section>
  )
}
