import { useEffect, useState } from 'react'

export interface Pour {
  id: string
  text: string
}

interface WaterTankProps {
  /** Altura da água, 0–100 (%). */
  level: number
  /** Menos movimento (sistema pede "reduzir movimento"). */
  calm: boolean
  /** "+300 mL" que sobe pela água logo depois de registrar. */
  pours: Pour[]
  /** Muda quando a meta acaba de ser batida: dispara os anéis e as bolhas. */
  burstKey: number
}

const W = 780

/** Bolhas que sobem devagar o tempo todo (posição %, tamanho px, duração s, atraso s). */
const AMBIENT = [
  { x: 14, s: 8, d: 6.5, t: 0 },
  { x: 31, s: 5, d: 7.8, t: 2.4 },
  { x: 49, s: 10, d: 8.6, t: 4.1 },
  { x: 64, s: 6, d: 6.9, t: 1.2 },
  { x: 79, s: 7, d: 9.2, t: 3.3 },
  { x: 90, s: 4, d: 7.1, t: 5.4 },
]

/** Água do tanque: duas "ondas" girando, nível animado, bolhas e comemoração da meta. */
export function WaterTank({ level, calm, pours, burstKey }: WaterTankProps) {
  // Começa em 0 e sobe até o nível: a água "enche" ao abrir a tela.
  const [shownLevel, setShownLevel] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShownLevel(level))
    return () => cancelAnimationFrame(id)
  }, [level])

  const slow = calm ? 2.2 : 1
  const rise = `${-Math.round((288 * shownLevel) / 100 - 20)}px`

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ height: `${shownLevel}%`, transition: 'height 1.6s cubic-bezier(.2,1.15,.35,1)' }}
      >
        <div
          className="absolute rounded-[42%] bg-wave-back"
          style={{
            left: '50%',
            top: -16,
            width: W,
            height: W,
            marginLeft: -W / 2 - 60,
            animation: `wave-spin ${15 * slow}s linear infinite`,
          }}
        />
        <div
          className="absolute rounded-[44%] bg-wave-front"
          style={{
            left: '50%',
            top: -6,
            width: W,
            height: W,
            marginLeft: -W / 2 + 40,
            animation: `wave-spin ${11 * slow}s linear infinite reverse`,
          }}
        />
        {!calm &&
          pours.map((pour) => (
            <span
              key={pour.id}
              className="absolute right-6 text-[17px] font-black whitespace-nowrap text-primary-strong opacity-0"
              style={{ top: -40, animation: 'pour-float 1.9s ease-out forwards' }}
            >
              {pour.text}
            </span>
          ))}
      </div>
      {!calm &&
        shownLevel > 20 &&
        AMBIENT.map((bubble, index) => (
          <span
            key={index}
            className="absolute box-border rounded-full border-[1.5px] border-white/80 opacity-0"
            style={
              {
                bottom: 6,
                left: `${bubble.x}%`,
                width: bubble.s,
                height: bubble.s,
                '--rise': rise,
                animation: `bubble-rise ${bubble.d}s ease-in ${bubble.t}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}
      {!calm && burstKey > 0 && (
        <div key={burstKey} className="absolute inset-0">
          <span
            className="absolute size-40 rounded-full border-[3px] border-white/90 opacity-0"
            style={{ left: '50%', top: '50%', animation: 'goal-ring 1.3s ease-out forwards' }}
          />
          <span
            className="absolute size-40 rounded-full border-2 border-primary/50 opacity-0"
            style={{ left: '50%', top: '50%', animation: 'goal-ring 1.6s ease-out .15s forwards' }}
          />
          {Array.from({ length: 16 }, (_, k) => {
            const size = 5 + ((k * 7) % 9)
            return (
              <span
                key={k}
                className="absolute rounded-full bg-white/85 opacity-0"
                style={
                  {
                    bottom: 10,
                    left: `${6 + ((k * 37) % 88)}%`,
                    width: size,
                    height: size,
                    '--rise': `${-(120 + ((k * 53) % 150))}px`,
                    '--dx': `${((k % 5) - 2) * 10}px`,
                    animation: `bubble-rise ${1.4 + (k % 4) * 0.25}s ease-out ${(k % 6) * 0.08}s forwards`,
                  } as React.CSSProperties
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
