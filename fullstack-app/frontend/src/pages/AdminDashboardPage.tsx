import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import Layout from '@/components/Layout'
import CreateUserDialog from '@/components/CreateUserDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users,
  ClipboardList,
  FileText,
  ShieldCheck,
  Ban,
  CheckCircle2,
  RefreshCw,
  History,
  Activity,
  UserPlus,
  Upload,
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
  const { user } = useAuth()
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAudit, setShowAudit] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    setLoading(true)
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

  // Parse a simple CSV (no quoted-comma support) into row objects keyed by header.
  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const cells = line.split(',').map((c) => c.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cells[i] ?? '' })
      return row
    })
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      setImporting(true)
      try {
        const text = await file.text()
        const rows = parseCsv(text)
        if (rows.length === 0) {
          toast.error('CSV is empty or missing a header row.')
          return
        }
        const { data } = await api.post('/admin/users/import', { users: rows })
        if (data.created > 0) {
          toast.success(`${data.created} user(s) created. ${data.skipped} skipped.`)
        } else {
          toast.error(`No users created. ${data.skipped} skipped.`)
        }
        if (data.errors?.length) {
          console.warn('Import errors:', data.errors)
          toast.message(`Skipped rows: ${data.errors.map((er: { row: number; reason: string }) => `#${er.row} (${er.reason})`).slice(0, 5).join(', ')}`)
        }
        fetchData()
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
        toast.error(msg || 'Import failed')
      } finally {
        setImporting(false)
      }
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleToggleStatus = async (userId: number, userName: string, currentStatus: boolean) => {
    const action = currentStatus ? 'suspend' : 'activate'
    if (!window.confirm(`Are you sure you want to ${action} "${userName}"?`)) return
    setActionLoading(userId)
    try {
      await api.put(`/admin/users/${userId}/toggle-status`)
      fetchData()
    } catch { /* ignore */ } finally {
      setActionLoading(null)
    }
  }

  const handleChangeRole = async (userId: number, userName: string, newRole: string) => {
    if (!window.confirm(`Change role of "${userName}" to "${newRole}"?`)) return
    setActionLoading(userId)
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole })
      fetchData()
    } catch { /* ignore */ } finally {
      setActionLoading(null)
    }
  }

  const totalUsers = stats?.totalUsers ?? stats?.users?.reduce((sum, u) => sum + u.count, 0) ?? 0
  const statCards = [
    { title: 'Total Users', value: totalUsers, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
    { title: 'Assignments', value: stats?.totalAssignments ?? 0, icon: ClipboardList, color: 'text-blue-600 bg-blue-50' },
    { title: 'Submissions', value: stats?.totalSubmissions ?? 0, icon: FileText, color: 'text-green-600 bg-green-50' },
    { title: 'Grades Given', value: stats?.totalGrades ?? 0, icon: ShieldCheck, color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and user management</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className={`mr-2 h-4 w-4 ${importing ? 'animate-pulse' : ''}`} />
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <CreateUserDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        allowedRoles={['student', 'lecturer', 'admin']}
        onCreated={fetchData}
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
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            CSV import expects a header row with columns: name, email, password, role, studentId, staffId, department, programme, level, phone.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{u.name}</td>
                      <td className="py-3 text-muted-foreground">{u.email}</td>
                      <td className="py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u.id, u.name, e.target.value)}
                          disabled={actionLoading === u.id || u.id === user?.id}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          <option value="student">Student</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3">
                        {u.is_active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <Ban className="mr-1 h-3 w-3" />
                            Suspended
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(u.id, u.name, u.is_active)}
                          disabled={actionLoading === u.id || u.id === user?.id}
                          className={u.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
