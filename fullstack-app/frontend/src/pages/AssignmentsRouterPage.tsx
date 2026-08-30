import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import MyAssignmentsPage from '@/pages/MyAssignmentsPage'
import AssignmentsListPage from '@/pages/AssignmentsListPage'

export default function AssignmentsRouterPage() {
  usePageTitle('Assignments')
  const { user } = useAuth()
  return user?.role === 'lecturer' ? <MyAssignmentsPage /> : <AssignmentsListPage />
}
