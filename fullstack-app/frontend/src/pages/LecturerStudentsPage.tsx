import { useState, useEffect, useRef, type ChangeEvent } from 'react'
import api, { readApiCache } from '@/services/api'
import Layout from '@/components/Layout'
import CreateUserDialog from '@/components/CreateUserDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Download, Upload, UserPlus, RefreshCw, Users } from 'lucide-react'

interface Student {
  id: number
  name: string
  email: string
}

const TEMPLATE_HEADERS = ['name', 'email', 'password', 'role', 'studentId', 'staffId', 'department', 'programme', 'level', 'phone']

export default function LecturerStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchStudents = async (showLoading = true) => {
    const cachedStudents = readApiCache<Student[]>('/users/students')
    if (cachedStudents) {
      setStudents(cachedStudents)
      setLoading(false)
    } else if (showLoading) {
      setLoading(true)
    }

    try {
      const { data } = await api.get('/users/students')
      setStudents(data)
    } catch { /* ignore */ } finally {
      if (!cachedStudents) setLoading(false)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

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
    link.download = 'student-import-template.csv'
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

      const { data } = await api.post('/users/import', { users: rows })
      if (data.created > 0) {
        toast.success(`${data.created} student(s) created. ${data.skipped} skipped.`)
      } else {
        toast.error(`No students created. ${data.skipped} skipped.`)
      }
      if (data.errors?.length) {
        toast.message(`Skipped rows: ${data.errors.map((error: { row: number; reason: string }) => `#${error.row} (${error.reason})`).slice(0, 5).join(', ')}`)
      }
      fetchStudents(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { details?: string } } })?.response?.data?.details
      toast.error(msg || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => { fetchStudents(false) }, [])

  return (
    <Layout>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Add and manage student accounts</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className={`mr-2 h-4 w-4 ${importing ? 'animate-pulse' : ''}`} />
            {importing ? 'Importing...' : 'Bulk Upload CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchStudents(true)} disabled={loading}>
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
      <p className="mt-2 text-sm text-muted-foreground">
        Lecturer uploads create only student accounts. Any role value in the CSV is ignored and imported rows are always created as students.
      </p>

      <CreateUserDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        allowedRoles={['student']}
        onCreated={fetchStudents}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Students
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students yet. Click "Add Student" to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-3 font-medium">{s.name}</td>
                      <td className="py-3 text-muted-foreground">{s.email}</td>
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
