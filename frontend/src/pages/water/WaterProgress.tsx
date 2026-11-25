import { Link } from 'react-router-dom'
import type { WaterToday } from '@/types/water'
import { formatMl } from '@/utils/format'

/** Total do dia × meta, com a barra de progresso e "quanto falta". */
export function WaterProgress({ today }: { today: WaterToday }) {
  const { goalMl, totalMl, remainingMl, goalReached } = today

  if (goalMl === null) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Você ainda não tem uma meta diária.</p>
        <p className="mt-1 text-2xl font-bold">{formatMl(totalMl)} hoje</p>
        <Link
          to="/agua/configuracao"
          className="mt-3 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Definir meta
        </Link>
      </section>
    )
  }

  const percent = Math.min(100, Math.round((totalMl / goalMl) * 100))

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-live="polite">
      <p className="text-3xl font-bold">
        {formatMl(totalMl)} <span className="text-base font-normal text-muted-foreground">de {formatMl(goalMl)}</span>
      </p>
      <div
        className="mt-3 h-3 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Progresso da meta de hoje"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className={`h-full rounded-full transition-all ${goalReached ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {goalReached ? (
        <p className="mt-2 font-semibold text-success">Meta batida! 🎉</p>
      ) : (
        <p className="mt-2 font-semibold">Faltam {formatMl(remainingMl ?? 0)}</p>
      )}
    </section>
  )
}
