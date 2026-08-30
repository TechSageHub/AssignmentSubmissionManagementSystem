import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import api, { readApiCache } from '@/services/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import Layout from '@/components/Layout'
import CreateUserDialog from '@/components/CreateUserDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Download, Upload, UserPlus, RefreshCw, Search } from 'lucide-react'

interface AdminUser {
  id: number
  name: string
  email: string
  role: string
  is_verified: boolean
  is_active: boolean
  created_at: string
}

interface UserPageResponse {
  items: AdminUser[]
  total: number
  limit: number
  offset: number
}

const TEMPLATE_HEADERS = ['name', 'email', 'password', 'role', 'studentId', 'staffId', 'department', 'programme', 'level', 'phone']
const PAGE_SIZE = 20

function buildPageNumbers(current: number, last: number): (number | '...')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const result: (number | '...')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(last - 1, current + 1)
  if (start > 2) result.push('...')
  for (let p = start; p <= end; p++) result.push(p)
  if (end < last - 1) result.push('...')
  result.push(last)
  return result
}

export default function UserManagementPage() {
  usePageTitle('User Management')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cacheKey = `/admin/users?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ''}`

  const fetchUsers = async (useCache = true) => {
    const cached = useCache ? readApiCache<UserPageResponse>(cacheKey) : null
    if (cached) {
      setUsers(cached.items)
      setTotal(cached.total)
      setLoading(false)
    } else {
      setLoading(true)
    }

    try {
      const { data } = await api.get(cacheKey)
      setUsers(data.items)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
      toast.error('Unable to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    fetchUsers(true)
  }, [cacheKey, refreshKey])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const downloadTemplate = () => {
    const sampleRow = [
      'John Doe',
      'john.doe@fpi.edu.ng',
      'ChangeMe123',
      'student',
      'ND/ICT/2024/0001',
      '',
      'Computer Science',
      'Computer Science',
      'ND I',
      '08031234567',
    ]

    const csvRows = [TEMPLATE_HEADERS, sampleRow]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\r\n')

    const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user-import-template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const cells = line.split(',').map((cell) => cell.trim())
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = cells[index] ?? ''
      })
      return row
    })
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
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
        toast.message(`Skipped rows: ${data.errors.map((error: { row: number; reason: string }) => `#${error.row} (${error.reason})`).slice(0, 5).join(', ')}`)
      }
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users, import enrollments, and download the CSV template.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className={`mr-2 h-4 w-4 ${importing ? 'animate-pulse' : ''}`} />
            {importing ? 'Importing...' : 'Bulk Upload CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImport}
        className="hidden"
      />

      <CreateUserDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        allowedRoles={['student', 'lecturer', 'admin']}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with a header row and one row per user. The template button downloads the exact format expected by the system.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li><strong>Headers required:</strong> name, email, password, role, studentId, staffId, department, programme, level, phone.</li>
            <li><strong>Role values:</strong> student, lecturer, admin.</li>
            <li><strong>Password:</strong> temporary password for the user to log in and change later.</li>
            <li><strong>Optional fields:</strong> studentId, staffId, department, programme, level, phone.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            You can edit the downloaded CSV in Microsoft Word, Excel, or any text editor, then upload it here.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All users</CardTitle>
            <p className="text-sm text-muted-foreground">Manage the full list of users created in the system.</p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-8 sm:w-64"
              />
            </div>
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {total} user{total === 1 ? '' : 's'} found
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4, 5].map((index) => <Skeleton key={index} className="h-12 rounded" />)}</div>
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
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                        {search ? 'No users match your search.' : 'No users have been created yet.'}
                      </td>
                    </tr>
                  ) : (
                    users.map((userItem) => (
                      <tr key={userItem.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{userItem.name}</td>
                        <td className="py-3 text-muted-foreground">{userItem.email}</td>
                        <td className="py-3">{userItem.role}</td>
                        <td className="py-3">
                          <Badge variant="outline" className={userItem.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                            {userItem.is_active ? 'Active' : 'Suspended'}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">{new Date(userItem.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!loading && totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {buildPageNumbers(page, totalPages).map((p, i) =>
                      p === '...' ? (
                        <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === page ? 'default' : 'outline'}
                          size="sm"
                          className="min-w-9"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      ),
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  )
}
