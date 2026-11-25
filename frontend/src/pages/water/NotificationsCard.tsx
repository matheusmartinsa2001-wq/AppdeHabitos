import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/ui/toast'
import * as push from '@/lib/push'
import * as pushService from '@/services/pushService'
import { extractErrorMessage } from '@/utils/errors'

type State =
  | { kind: 'loading' }
  | { kind: 'server-off' }
  | { kind: 'ios-needs-install' }
  | { kind: 'unsupported' }
  | { kind: 'denied' }
  | { kind: 'off'; publicKey: string }
  | { kind: 'on' }

const STATUS: Record<State['kind'], string> = {
  loading: 'Verificando…',
  'server-off': 'Ainda não configuradas no servidor',
  'ios-needs-install': 'No iPhone, instale o app: Compartilhar → Adicionar à Tela de Início',
  unsupported: 'Este navegador não recebe notificações',
  denied: 'Bloqueadas. Libere em Ajustes → Notificações → Hábitos',
  off: 'Desativadas neste aparelho',
  on: 'Ativadas neste aparelho',
}

/** Notificações dos lembretes numa chave, com "Enviar teste" (design "Módulo Água"). */
export function NotificationsCard() {
  const { showToast } = useToast()
  // Sem suporte no navegador já se sabe na hora; com suporte, falta perguntar ao servidor.
  const [state, setState] = useState<State>(() => {
    const support = push.getPushSupport()
    return support === 'supported' ? { kind: 'loading' } : { kind: support }
  })
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)

  // Sem `async` aqui: o estado só muda quando as promessas resolvem (lint set-state-in-effect).
  const load = useCallback(
    () =>
      pushService
        .getPushStatus()
        .then(async (status): Promise<State> => {
          if (!status.enabled || !status.publicKey) return { kind: 'server-off' }
          if (push.getPermission() === 'denied') return { kind: 'denied' }
          const subscription = await push.getCurrentSubscription()
          return subscription ? { kind: 'on' } : { kind: 'off', publicKey: status.publicKey }
        })
        .catch((error: unknown): State => {
          console.error(error)
          return { kind: 'unsupported' }
        })
        .then(setState),
    [],
  )

  useEffect(() => {
    if (push.getPushSupport() === 'supported') void load()
  }, [load])

  const on = state.kind === 'on'
  const canToggle = state.kind === 'on' || state.kind === 'off'

  const toggle = async () => {
    if (!canToggle || busy) return
    setBusy(true)
    try {
      if (state.kind === 'off') {
        // Pedido de permissão dentro do toque (exigência do iPhone).
        const subscription = await push.subscribeToPush(state.publicKey)
        if (!subscription) {
          setState({ kind: 'denied' })
          return
        }
        await pushService.savePushSubscription(subscription)
        setState({ kind: 'on' })
      } else {
        const endpoint = await push.unsubscribeFromPush()
        if (endpoint) await pushService.removePushSubscription(endpoint)
        await load()
      }
    } catch (error) {
      showToast(extractErrorMessage(error, 'Não foi possível mudar as notificações.'))
    } finally {
      setBusy(false)
    }
  }

  const test = async () => {
    setTesting(true)
    try {
      const { sent } = await pushService.sendTestPush()
      showToast(sent > 0 ? 'Teste enviado: deve chegar em segundos' : 'Nenhum aparelho recebeu. Desligue e ligue a chave.')
    } catch (error) {
      showToast(extractErrorMessage(error))
    } finally {
      setTesting(false)
    }
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="px-1 text-xl font-black">Notificações</h2>
      <div className="flex flex-col rounded-3xl bg-card px-[18px] py-1">
        <div
          role="switch"
          aria-checked={on}
          aria-disabled={!canToggle || busy}
          aria-label="Avisar no horário dos lembretes"
          tabIndex={0}
          onClick={() => void toggle()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              void toggle()
            }
          }}
          className="flex min-h-[68px] items-center justify-between gap-3 outline-none"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-[17px] font-extrabold">Avisar no horário dos lembretes</span>
            <span className={`text-[13px] font-bold ${on ? 'text-success' : 'text-muted-foreground'}`}>{STATUS[state.kind]}</span>
          </span>
          <span
            aria-hidden
            className={`relative h-[34px] w-14 flex-none rounded-full transition-colors duration-200 ${on ? 'bg-primary' : 'bg-today-fill'} ${canToggle ? '' : 'opacity-50'}`}
          >
            <span
              className="absolute top-[3px] left-[3px] size-7 rounded-full bg-card shadow-[0_2px_6px_rgba(15,42,51,.25)] transition-transform duration-300 ease-[cubic-bezier(.3,1.4,.5,1)]"
              style={{ transform: on ? 'translateX(22px)' : 'translateX(0px)' }}
            />
          </span>
        </div>
        {on && (
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3 pb-3.5">
            <span className="text-sm leading-snug font-bold text-muted-foreground">Confira se chegam neste aparelho.</span>
            <button
              type="button"
              disabled={testing}
              onClick={() => void test()}
              className="h-11 flex-none rounded-[14px] border-[1.5px] border-border bg-card px-4 text-[15px] font-extrabold"
            >
              {testing ? 'Enviando…' : 'Enviar teste'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
