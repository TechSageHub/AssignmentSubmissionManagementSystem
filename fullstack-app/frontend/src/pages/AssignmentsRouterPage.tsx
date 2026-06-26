import { useAuth } from '@/hooks/useAuth'
import MyAssignmentsPage from '@/pages/MyAssignmentsPage'
import AssignmentsListPage from '@/pages/AssignmentsListPage'

export default function AssignmentsRouterPage() {
  const { user } = useAuth()
  return user?.role === 'lecturer' ? <MyAssignmentsPage /> : <AssignmentsListPage />
}
