import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute, LecturerRoute, AdminRoute } from '@/components/ProtectedRoute'
import PageTransitionLoader from '@/components/PageTransitionLoader'
import { Toaster } from '@/components/ui/toaster'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import ChangePasswordPage from '@/pages/ChangePasswordPage'
import DashboardPage from '@/pages/DashboardPage'
import HomePage from '@/pages/HomePage'
import AboutPage from '@/pages/AboutPage'
import ContactPage from '@/pages/ContactPage'
import CreateAssignmentPage from '@/pages/CreateAssignmentPage'
import EditAssignmentPage from '@/pages/EditAssignmentPage'
import AssignmentsRouterPage from '@/pages/AssignmentsRouterPage'
import AssignmentDetailPage from '@/pages/AssignmentDetailPage'
import AssignmentSubmissionsPage from '@/pages/AssignmentSubmissionsPage'
import MySubmissionsPage from '@/pages/MySubmissionsPage'
import GradeSubmissionPage from '@/pages/GradeSubmissionPage'
import ViewSubmissionPage from '@/pages/ViewSubmissionPage'
import AdminDashboardPage from '@/pages/AdminDashboardPage'
import UserManagementPage from '@/pages/UserManagementPage'
import LecturerStudentsPage from '@/pages/LecturerStudentsPage'
import ProfilePage from '@/pages/ProfilePage'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : <HomePage />
}

function AppContent() {
  const location = useLocation()
  const [transitioning, setTransitioning] = useState(false)
  const previousPath = useRef(location.pathname)

  useEffect(() => {
    if (location.pathname !== previousPath.current) {
      setTransitioning(true)
      previousPath.current = location.pathname
      const timeout = window.setTimeout(() => {
        setTransitioning(false)
      }, 400)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [location.pathname])

  return (
    <>
      <PageTransitionLoader active={transitioning} />
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
    </>
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
