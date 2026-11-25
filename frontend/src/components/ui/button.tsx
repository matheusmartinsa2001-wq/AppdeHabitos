import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  outline: 'border border-border bg-card text-foreground hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
} as const

interface ButtonProps extends ComponentProps<'button'> {
  variant?: keyof typeof variants
  /** Ação indo ao servidor: desabilita, mostra o spinner e evita duplo envio. */
  loading?: boolean
}

export function Button({ variant = 'primary', loading = false, disabled, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        // min-h-11: área de toque de 44px (iPhone).
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-opacity',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
