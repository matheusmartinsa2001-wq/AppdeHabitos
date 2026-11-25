import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { extractErrorMessage } from '@/utils/errors'

const schema = z.object({
  // Sem trim: espaço faz parte da senha. Máximo igual ao @MaxLength do backend (bcrypt).
  password: z.string().min(1, 'Digite a senha').max(72, 'Use no máximo 72 caracteres'),
})

type FormValues = z.infer<typeof schema>

/** Login da conta única: só senha (docs/regras-negocio.md → "Acesso"). */
export function LoginPage() {
  const { status, sessionExpired, login } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { password: '' } })

  if (status === 'authenticated') {
    return <Navigate to="/" replace />
  }

  const onSubmit = async ({ password }: FormValues) => {
    setSubmitError(null)
    try {
      await login(password)
    } catch (error) {
      setSubmitError(extractErrorMessage(error))
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-primary">App de Hábitos</h1>
        <p className="text-sm text-muted-foreground">Digite sua senha para entrar.</p>
      </header>

      {sessionExpired && (
        <p role="status" className="rounded-md bg-muted px-3 py-2 text-center text-sm text-muted-foreground">
          Sua sessão terminou. Entre de novo.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          aria-invalid={errors.password ? true : undefined}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="mt-2">
          Entrar
        </Button>
      </form>
    </main>
  )
}
