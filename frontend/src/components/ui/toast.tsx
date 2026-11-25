import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface ToastOptions {
  /** Ação "Desfazer" no próprio aviso (ex.: logo depois de registrar água). */
  onUndo?: () => void
}

interface ToastState {
  id: number
  text: string
  onUndo?: () => void
}

interface ToastContextValue {
  showToast: (text: string, options?: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const VISIBLE_MS = 4500

/** Aviso escuro acima da barra inferior, com "Desfazer" opcional (design "Módulo Água"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToast = useCallback((text: string, options?: ToastOptions) => {
    clearTimeout(timer.current)
    setToast({ id: Date.now(), text, onUndo: options?.onUndo })
    setVisible(true)
    timer.current = setTimeout(() => setVisible(false), VISIBLE_MS)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed inset-x-5 z-40 mx-auto flex min-h-14 max-w-[402px] items-center justify-between gap-3 rounded-[18px] bg-foreground py-1.5 pr-1.5 pl-[18px] text-primary-foreground shadow-[0_12px_30px_rgba(15,42,51,.28)] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,1.2,.4,1)]"
        style={{
          bottom: 'calc(104px + env(safe-area-inset-bottom))',
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        }}
      >
        <span className="text-[15px] font-bold">{toast?.text}</span>
        {toast?.onUndo && (
          <button
            type="button"
            className="h-11 flex-none rounded-xl px-3.5 text-[15px] font-black text-wave-accent"
            onClick={() => {
              setVisible(false)
              toast.onUndo?.()
            }}
          >
            Desfazer
          </button>
        )}
      </div>
    </ToastContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast deve ser usado dentro de um ToastProvider')
  return context
}
