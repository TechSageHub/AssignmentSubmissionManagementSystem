import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  UserPlus,
  LogOut,
  Menu,
  Shield,
  Settings,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import NotificationBell from '@/components/NotificationBell'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['student', 'lecturer', 'admin'] },
  { icon: Shield, label: 'Admin Panel', path: '/admin', roles: ['admin'] },
  { icon: UserPlus, label: 'User Management', path: '/admin/users', roles: ['admin'] },
  { icon: ClipboardList, label: 'Assignments', path: '/assignments', roles: ['student', 'lecturer'] },
  { icon: UserPlus, label: 'Students', path: '/students', roles: ['lecturer'] },
  { icon: FileText, label: 'My Submissions', path: '/my-submissions', roles: ['student'] },
  { icon: Settings, label: 'Profile', path: '/profile', roles: ['student', 'lecturer'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src="/fpi-logo.png" alt="FPI Logo" className="h-8 w-8 object-contain" />
          <span className="font-semibold tracking-tight">FPI - ASMS</span>
        </Link>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => item.roles.includes(user?.role || ''))
          .map((item) => {
            const active = item.path === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-primary/5 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
      </nav>

      <Separator />

      <div className="p-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="mt-2 w-full justify-start gap-2 text-muted-foreground" onClick={logout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile trigger bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src="/fpi-logo.png" alt="FPI Logo" className="h-7 w-7 object-contain" />
            <span className="font-semibold text-sm">FPI - ASMS</span>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-card shadow-lg animate-in slide-in-from-left">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:border-r lg:bg-card">
        {sidebarContent}
      </aside>
    </>
  )
}
