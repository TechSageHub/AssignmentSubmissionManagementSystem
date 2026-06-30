import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { readApiCache } from '@/services/api'
import Layout from '@/components/Layout'
import CreateUserDialog from '@/components/CreateUserDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  ClipboardList,
  FileText,
  ShieldCheck,
  RefreshCw,
  History,
  Activity,
  UserPlus,
} from 'lucide-react'

interface SystemStats {
  users: { role: string; count: number }[]
  totalUsers: number
  totalAssignments: number
  totalSubmissions: number
  totalGrades: number
}

interface AdminUser {
  id: number
  name: string
  email: string
  role: string
  is_verified: boolean
  is_active: boolean
  created_at: string
}

interface AuditEntry {
  id: number
  user_name: string
  action: string
  entity_type: string
  entity_id: number
  details: string
  created_at: string
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAudit, setShowAudit] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const fetchData = async (showLoading = true) => {
    const cachedStats = readApiCache<SystemStats>('/admin/stats')
    const cachedUsers = readApiCache<AdminUser[]>('/admin/users')
    const hasCachedData = Boolean(cachedStats) || Boolean(cachedUsers)

    if (cachedStats) setStats(cachedStats)
    if (cachedUsers) setUsers(cachedUsers)
    if (hasCachedData) {
      setLoading(false)
    } else if (showLoading) {
      setLoading(true)
    }

    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
      ])
      setStats(statsRes.data)
      setUsers(usersRes.data)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const { data } = await api.get('/admin/audit-logs')
      setAuditLogs(data)
      setShowAudit(true)
    } catch { /* ignore */ } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => { fetchData(false) }, [])


  const totalUsers = stats?.totalUsers ?? stats?.users?.reduce((sum, u) => sum + u.count, 0) ?? 0
  const statCards = [
    { title: 'Total Users', value: totalUsers, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
    { title: 'Assignments', value: stats?.totalAssignments ?? 0, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { title: 'Submissions', value: stats?.totalSubmissions ?? 0, icon: FileText, color: 'text-green-600 bg-green-50' },
    { title: 'Grades Given', value: stats?.totalGrades ?? 0, icon: ShieldCheck, color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and recent users</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
            <FileText className="mr-2 h-4 w-4" />
            Manage Users
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <CreateUserDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        allowedRoles={['student', 'lecturer', 'admin']}
        onCreated={() => fetchData(false)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Recent users</CardTitle>
            <p className="text-sm text-muted-foreground">Showing the 5 most recently added users. Manage the full list on the user management page.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
            <FileText className="mr-2 h-4 w-4" />
            View all users
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No user records available.</p>
          ) : (
            <div className="space-y-3">
              {[...users]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((u) => (
                  <div key={u.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{u.role}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">{new Date(u.created_at).toLocaleDateString()}</span>
                      <Badge variant="outline" className={u.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                        {u.is_active ? 'Active' : 'Suspended'}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={auditLoading} className="gap-2">
            <Activity className={`h-4 w-4 ${auditLoading ? 'animate-spin' : ''}`} />
            {auditLoading ? 'Loading...' : showAudit ? 'Refresh' : 'View Logs'}
          </Button>
        </CardHeader>
        <CardContent>
          {!showAudit ? (
            <p className="text-sm text-muted-foreground">Click "View Logs" to see recent activity.</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground sticky top-0 bg-card">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Action</th>
                    <th className="pb-3 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-2">{log.user_name}</td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">{log.action}</Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {log.entity_type} #{log.entity_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  )
}
