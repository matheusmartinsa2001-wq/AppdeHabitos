import { useEffect, useRef, useState } from 'react'

/**
 * Número que "conta" até o valor novo (ex.: o total de água). Sempre termina exatamente no
 * valor certo, mesmo que o navegador pause a animação (aba em segundo plano).
 */
export function useTweenedNumber(target: number, durationMs: number): number {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    const from = shownRef.current
    if (from === target) return
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / durationMs)
      const value = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)))
      shownRef.current = value
      setShown(value)
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    const fallback = setTimeout(() => {
      cancelAnimationFrame(frame)
      shownRef.current = target
      setShown(target)
    }, durationMs + 80)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(fallback)
    }
  }, [target, durationMs])

  return shown
}
