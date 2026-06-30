import { Toaster as SonnerToaster } from "sonner"
import { CheckCircle2 } from 'lucide-react'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: "hsl(0 0% 100%)",
          color: "hsl(222 47% 11%)",
          border: "1px solid hsl(214 32% 91%)",
          borderRadius: "8px",
          fontSize: "14px",
        },
        classNames: {
          toast: 'border border-slate-200 bg-white',
          title: 'font-semibold',
          success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
        },
      }}
      icons={{
        success: <CheckCircle2 className="text-emerald-600" />,
      }}
    />
  )
}
