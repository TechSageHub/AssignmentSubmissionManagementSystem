import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute, LecturerRoute, AdminRoute } from '@/components/ProtectedRoute'
import { Toaster } from '@/components/ui/toaster'
import FullPageSpinner from '@/components/FullPageSpinner'
import HomePage from '@/pages/HomePage'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))
const ChangePasswordPage = lazy(() => import('@/pages/ChangePasswordPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const CreateAssignmentPage = lazy(() => import('@/pages/CreateAssignmentPage'))
const EditAssignmentPage = lazy(() => import('@/pages/EditAssignmentPage'))
const AssignmentsRouterPage = lazy(() => import('@/pages/AssignmentsRouterPage'))
const AssignmentDetailPage = lazy(() => import('@/pages/AssignmentDetailPage'))
const AssignmentSubmissionsPage = lazy(() => import('@/pages/AssignmentSubmissionsPage'))
const MySubmissionsPage = lazy(() => import('@/pages/MySubmissionsPage'))
const GradeSubmissionPage = lazy(() => import('@/pages/GradeSubmissionPage'))
const ViewSubmissionPage = lazy(() => import('@/pages/ViewSubmissionPage'))
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'))
const UserManagementPage = lazy(() => import('@/pages/UserManagementPage'))
const LecturerStudentsPage = lazy(() => import('@/pages/LecturerStudentsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))

function PageFallback() {
  return <FullPageSpinner />
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  return user ? <Navigate to="/dashboard" replace /> : <HomePage />
}

function AppContent() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
      {/* Public pages */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected pages */}
      <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

      <Route path="/assignments" element={<ProtectedRoute><AssignmentsRouterPage /></ProtectedRoute>} />
      <Route path="/assignments/new" element={
        <ProtectedRoute><LecturerRoute><CreateAssignmentPage /></LecturerRoute></ProtectedRoute>
      } />
      <Route path="/assignments/:id" element={
        <ProtectedRoute><AssignmentDetailPage /></ProtectedRoute>
      } />
      <Route path="/assignments/:id/edit" element={
        <ProtectedRoute><LecturerRoute><EditAssignmentPage /></LecturerRoute></ProtectedRoute>
      } />
      <Route path="/assignments/:id/submissions" element={
        <ProtectedRoute><LecturerRoute><AssignmentSubmissionsPage /></LecturerRoute></ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute><AdminRoute><AdminDashboardPage /></AdminRoute></ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute><AdminRoute><UserManagementPage /></AdminRoute></ProtectedRoute>
      } />

      <Route path="/students" element={
        <ProtectedRoute><LecturerRoute><LecturerStudentsPage /></LecturerRoute></ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      } />
      <Route path="/my-submissions" element={
        <ProtectedRoute><MySubmissionsPage /></ProtectedRoute>
      } />
      <Route path="/submissions/:submissionId" element={
        <ProtectedRoute><ViewSubmissionPage /></ProtectedRoute>
      } />
      <Route path="/submissions/:submissionId/grade" element={
        <ProtectedRoute><LecturerRoute><GradeSubmissionPage /></LecturerRoute></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

export default App
