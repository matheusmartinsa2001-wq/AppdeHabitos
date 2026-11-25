import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ReminderInput, WaterReminder } from '@/types/water'
import { extractErrorMessage } from '@/utils/errors'
import { formatMl } from '@/utils/format'
import { ReminderForm } from './ReminderForm'

interface ReminderItemProps {
  reminder: WaterReminder
  onUpdate: (id: string, input: ReminderInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

type Mode = 'view' | 'edit' | 'confirm-delete'

export function ReminderItem({ reminder, onUpdate, onDelete }: ReminderItemProps) {
  const [mode, setMode] = useState<Mode>('view')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmDelete = async () => {
    setDeleting(true)
    setError(null)
    try {
      await onDelete(reminder.id)
    } catch (err) {
      setError(extractErrorMessage(err))
      setDeleting(false)
    }
  }

  if (mode === 'edit') {
    return (
      <li className="border-b border-border py-3 last:border-b-0">
        <ReminderForm
          idPrefix={`edit-${reminder.id}`}
          initial={{ time: reminder.time, amountMl: reminder.amountMl }}
          submitLabel="Salvar"
          onSubmit={async (input) => {
            await onUpdate(reminder.id, input)
            setMode('view')
          }}
          onCancel={() => setMode('view')}
        />
      </li>
    )
  }

  const label = `${reminder.time} · ${formatMl(reminder.amountMl)}`

  return (
    <li className="border-b border-border py-2 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-base">
          <strong>{reminder.time}</strong> · {formatMl(reminder.amountMl)}
        </span>
        {mode === 'view' ? (
          <div className="flex gap-1">
            <Button variant="ghost" className="px-3" onClick={() => setMode('edit')} aria-label={`Editar ${label}`}>
              Editar
            </Button>
            <Button
              variant="ghost"
              className="px-3 text-destructive"
              onClick={() => setMode('confirm-delete')}
              aria-label={`Excluir ${label}`}
            >
              Excluir
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Excluir?</span>
            <Button variant="ghost" className="px-3 text-destructive" loading={deleting} onClick={confirmDelete}>
              Sim
            </Button>
            <Button variant="ghost" className="px-3" disabled={deleting} onClick={() => setMode('view')}>
              Não
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  )
}
