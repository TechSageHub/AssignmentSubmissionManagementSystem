import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  Bell,
  BellRing,
  Clock,
  Award,
  ClipboardCheck,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import api, { readApiCache } from '@/services/api'

const notificationIcons: Record<string, React.ElementType> = {
  assignment_created: ClipboardCheck,
  submission_confirmed: CheckCircle2,
  grade_released: Award,
  deadline_reminder: Clock,
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  const days = Math.floor(mins / 1440)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (!user) return
    const cachedNotifications = readApiCache<{ notifications: any[]; unreadCount: number }>('/notifications?limit=10')
    if (cachedNotifications) {
      setNotifications(cachedNotifications.notifications)
      setUnreadCount(cachedNotifications.unreadCount)
    }

    try {
      const { data } = await api.get('/notifications?limit=10')
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch { /* ignore */ }
  }, [user])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch { /* ignore */ }
  }

  const handleNotifClick = async (notif: any) => {
    if (!notif.is_read) {
      try {
        await api.put(`/notifications/${notif.id}/read`)
        setUnreadCount(prev => Math.max(0, prev - 1))
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      } catch { /* ignore */ }
    }
    setNotifOpen(false)
    if (notif.link) navigate(notif.link)
  }

  return (
    <div className={cn("relative", className)} ref={notifRef}>
      <button
        onClick={() => setNotifOpen(!notifOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground shadow-sm"
        title="Notifications"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-4.5 w-4.5 text-primary animate-pulse" />
        ) : (
          <Bell className="h-4.5 w-4.5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-sm ring-2 ring-background">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {notifOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-xl border bg-card shadow-2xl animate-in fade-in-50 zoom-in-95">
          <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Notifications</span>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-88 overflow-y-auto divide-y divide-border/40">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = notificationIcons[notif.type] || Bell
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50",
                      !notif.is_read && "bg-primary/5"
                    )}
                  >
                    <div className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      !notif.is_read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs truncate", !notif.is_read ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.created_at)}</p>
                    </div>
                    {notif.link && (
                      <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
