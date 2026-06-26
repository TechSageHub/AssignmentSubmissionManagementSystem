import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import type { Assignment } from '@/types'
import Layout from '@/components/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Edit3, Eye, Trash2, Plus, Calendar, Users } from 'lucide-react'

export default function MyAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/assignments')
      .then(({ data }) => setAssignments(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/assignments/${id}`)
      setAssignments((prev) => prev.filter((a) => a.id !== id))
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <Layout>
        <div className="mb-8 flex items-center justify-between">
          <div><h1 className="text-2xl font-bold tracking-tight">My Assignments</h1></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Assignments</h1>
          <p className="text-muted-foreground">Manage your assignments</p>
        </div>
        <Link to="/assignments/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </Link>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No assignments yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.id} className="transition-all duration-150 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{a.title}</h3>
                  <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(a.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link to={`/assignments/${a.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to={`/assignments/${a.id}/edit`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to={`/assignments/${a.id}/submissions`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Users className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Assignment</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">Are you sure you want to delete "{a.title}"? This action cannot be undone.</p>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => {}}>Cancel</Button>
                        <Button variant="destructive" onClick={() => handleDelete(a.id)}>Delete</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
