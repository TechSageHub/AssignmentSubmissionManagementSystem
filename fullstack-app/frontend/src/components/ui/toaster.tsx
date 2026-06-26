import { Toaster as SonnerToaster } from "sonner"

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
      }}
    />
  )
}
