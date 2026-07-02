import { useEffect, useState } from 'react'

interface PageTransitionLoaderProps {
  active: boolean
}

export default function PageTransitionLoader({ active }: PageTransitionLoaderProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timeout: number | undefined
    if (active) {
      setVisible(true)
      timeout = window.setTimeout(() => setVisible(false), 350)
    }
    return () => {
      if (timeout) window.clearTimeout(timeout)
    }
  }, [active])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/90 shadow-xl shadow-slate-900/20">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-500" />
          <div className="absolute h-6 w-6 rounded-full bg-slate-950" />
        </div>
      </div>
    </div>
  )
}
