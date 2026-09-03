import type { ReactNode } from 'react'
import Sidebar from '@/components/Sidebar'
import NotificationBell from '@/components/NotificationBell'
import { useAuth } from '@/hooks/useAuth'

export default function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-60">
        {/* System Top Header Bar */}
        <header className="sticky top-0 z-30 hidden lg:flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Welcome back, <span className="font-semibold text-foreground">{user?.name}</span>
            </span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Top Right System Notification Bell */}
            <NotificationBell />
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
