import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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

/** Ativar/desativar as notificações dos lembretes neste aparelho, com envio de teste. */
export function NotificationsCard() {
  // Sem suporte no navegador já se sabe na hora; com suporte, falta perguntar ao servidor.
  const [state, setState] = useState<State>(() => {
    const support = push.getPushSupport()
    return support === 'supported' ? { kind: 'loading' } : { kind: support }
  })
  const [busy, setBusy] = useState<'enable' | 'disable' | 'test' | null>(null)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

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

  const enable = async (publicKey: string) => {
    setBusy('enable')
    setMessage(null)
    try {
      const subscription = await push.subscribeToPush(publicKey)
      if (!subscription) {
        setState({ kind: 'denied' })
        return
      }
      await pushService.savePushSubscription(subscription)
      setState({ kind: 'on' })
      setMessage({ tone: 'ok', text: 'Notificações ativadas neste aparelho.' })
    } catch (error) {
      setMessage({ tone: 'error', text: extractErrorMessage(error, 'Não foi possível ativar as notificações.') })
    } finally {
      setBusy(null)
    }
  }

  const disable = async () => {
    setBusy('disable')
    setMessage(null)
    try {
      const endpoint = await push.unsubscribeFromPush()
      if (endpoint) await pushService.removePushSubscription(endpoint)
      await load()
    } catch (error) {
      setMessage({ tone: 'error', text: extractErrorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  const test = async () => {
    setBusy('test')
    setMessage(null)
    try {
      const { sent } = await pushService.sendTestPush()
      setMessage(
        sent > 0
          ? { tone: 'ok', text: 'Notificação de teste enviada. Ela deve chegar em alguns segundos.' }
          : { tone: 'error', text: 'Nenhum aparelho recebeu. Desative e ative de novo.' },
      )
    } catch (error) {
      setMessage({ tone: 'error', text: extractErrorMessage(error) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-live="polite">
      <h2 className="font-semibold">Notificações dos lembretes</h2>
      <div className="mt-2 text-sm">
        {state.kind === 'loading' && <p className="text-muted-foreground">Verificando…</p>}
        {state.kind === 'server-off' && (
          <p className="text-muted-foreground">As notificações ainda não estão configuradas no servidor.</p>
        )}
        {state.kind === 'ios-needs-install' && (
          <p className="text-muted-foreground">
            No iPhone, as notificações só funcionam com o app instalado: no Safari, toque em Compartilhar →{' '}
            <strong>Adicionar à Tela de Início</strong> e abra o app pelo ícone.
          </p>
        )}
        {state.kind === 'unsupported' && (
          <p className="text-muted-foreground">Este navegador não recebe notificações.</p>
        )}
        {state.kind === 'denied' && (
          <p className="text-muted-foreground">
            As notificações estão bloqueadas. No iPhone, libere em <strong>Ajustes → Notificações → Hábitos</strong>.
          </p>
        )}
        {state.kind === 'off' && (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">Receba um aviso no horário de cada lembrete.</p>
            <Button loading={busy === 'enable'} onClick={() => void enable(state.publicKey)}>
              Ativar notificações
            </Button>
          </div>
        )}
        {state.kind === 'on' && (
          <div className="flex flex-col gap-2">
            <p className="font-medium text-success">✓ Ativadas neste aparelho</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" loading={busy === 'test'} disabled={busy !== null} onClick={() => void test()}>
                Enviar teste
              </Button>
              <Button variant="ghost" loading={busy === 'disable'} disabled={busy !== null} onClick={() => void disable()}>
                Desativar
              </Button>
            </div>
          </div>
        )}
        {message && (
          <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mt-2 ${message.tone === 'error' ? 'text-destructive' : 'text-success'}`}>
            {message.text}
          </p>
        )}
      </div>
    </section>
  )
}
