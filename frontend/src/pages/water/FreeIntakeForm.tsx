import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { intakeSchema, QUICK_AMOUNTS_ML } from './waterRules'

interface FreeIntakeFormProps {
  /** Ação em andamento na tela (desabilita os botões enquanto vai ao servidor). */
  busyKey: string | null
  onAdd: (amountMl: number, key: string) => Promise<boolean>
}

/** Registro livre: botões rápidos (+200/+300/+500) e "outro valor". */
export function FreeIntakeForm({ busyKey, onAdd }: FreeIntakeFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(intakeSchema), defaultValues: { amountMl: '' } })

  const submitOther = async ({ amountMl }: { amountMl: number }) => {
    if (await onAdd(amountMl, 'other')) reset({ amountMl: '' })
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="font-semibold">Registrar</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {QUICK_AMOUNTS_ML.map((amount) => (
          <Button
            key={amount}
            variant="outline"
            className="text-base"
            loading={busyKey === `quick-${amount}`}
            disabled={busyKey !== null}
            onClick={() => void onAdd(amount, `quick-${amount}`)}
          >
            +{amount}
          </Button>
        ))}
      </div>
      <form onSubmit={handleSubmit(submitOther)} noValidate className="mt-3 flex flex-col gap-1">
        <label htmlFor="other-amount" className="text-xs text-muted-foreground">
          Outro valor
        </label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Input
              id="other-amount"
              inputMode="numeric"
              aria-invalid={errors.amountMl ? true : undefined}
              className="h-11 pr-10"
              {...register('amountMl')}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              mL
            </span>
          </div>
          <Button type="submit" loading={busyKey === 'other'} disabled={busyKey !== null}>
            Adicionar
          </Button>
        </div>
        {errors.amountMl && <p className="text-xs text-destructive">{errors.amountMl.message}</p>}
      </form>
    </section>
  )
}
