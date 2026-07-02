import { useEffect, useState } from 'react'

interface PageTransitionLoaderProps {
  active: boolean
}

const segments = Array.from({ length: 8 })

export default function PageTransitionLoader({ active }: PageTransitionLoaderProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timeout: number | undefined
    if (active) {
      setVisible(true)
      timeout = window.setTimeout(() => setVisible(false), 450)
    }
    return () => {
      if (timeout) window.clearTimeout(timeout)
    }
  }, [active])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-sm">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/90 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.8)]">
        <div className="relative h-16 w-16 animate-spin">
          {segments.map((_, index) => {
            const angle = index * 45
            return (
              <span
                key={index}
                className={
                  `absolute top-1/2 left-1/2 block h-3 w-1.5 rounded-full bg-slate-400 opacity-40 ${
                    index === 0 ? 'bg-slate-700 opacity-100' : ''
                  }`
                }
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translate(0, -26px)`,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
