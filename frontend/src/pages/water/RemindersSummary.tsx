import type { WaterSettings } from '@/types/water'
import { formatMl } from '@/utils/format'

/** Soma dos lembretes × meta, com o aviso quando os lembretes não chegam à meta. */
export function RemindersSummary({ settings }: { settings: WaterSettings }) {
  const { goalMl, remindersTotalMl, remindersShortfallMl } = settings

  if (goalMl === null) {
    return (
      <section className="rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground" aria-live="polite">
        Salve a meta diária para comparar com os lembretes.
      </section>
    )
  }

  const short = (remindersShortfallMl ?? 0) > 0

  return (
    <section
      className={`rounded-lg border p-4 text-sm ${short ? 'border-warning' : 'border-success'}`}
      aria-live="polite"
    >
      <p>
        Os lembretes somam <strong>{formatMl(remindersTotalMl)}</strong> de <strong>{formatMl(goalMl)}</strong>.
      </p>
      {short ? (
        <p role="alert" className="mt-1 font-semibold text-warning">
          ⚠ Seguindo só os lembretes, você não bate a meta: faltam {formatMl(remindersShortfallMl ?? 0)}.
        </p>
      ) : (
        <p className="mt-1 font-semibold text-success">Seguindo os lembretes, você bate a meta.</p>
      )}
    </section>
  )
}
