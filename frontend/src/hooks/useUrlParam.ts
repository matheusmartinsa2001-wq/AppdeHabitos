import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Um valor guardado na URL (`?chave=valor`), para o "voltar" do navegador funcionar e o
 * link poder ser aberto de novo no mesmo estado. O valor padrão não aparece na URL.
 */
export function useUrlParam(key: string, defaultValue: string): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (next: string) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current)
        if (next === defaultValue) params.delete(key)
        else params.set(key, next)
        return params
      })
    },
    [key, defaultValue, setSearchParams],
  )

  return [value, setValue]
}
