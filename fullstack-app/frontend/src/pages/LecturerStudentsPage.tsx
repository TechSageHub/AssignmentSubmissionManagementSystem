import { useState, useEffect } from 'react'
import api, { readApiCache } from '@/services/api'
import Layout from '@/components/Layout'
import CreateUserDialog from '@/components/CreateUserDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { UserPlus, RefreshCw, Users } from 'lucide-react'

interface Student {
  id: number
  name: string
  email: string
}

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

  useEffect(() => { fetchStudents(false) }, [])

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Add and manage student accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchStudents(true)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

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
