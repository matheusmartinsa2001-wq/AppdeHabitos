import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        // text-base (16px): abaixo disso o Safari do iPhone dá zoom ao focar o campo.
        'min-h-11 w-full rounded-md border border-border bg-card px-3 text-base',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}
