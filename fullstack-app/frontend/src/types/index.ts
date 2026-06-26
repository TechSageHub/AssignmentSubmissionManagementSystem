export interface User {
  id: number
  name: string
  email: string
  username?: string
  role: 'student' | 'lecturer' | 'admin'
  student_id?: string
  staff_id?: string
  department?: string
  programme?: string
  level?: string
  phone?: string
  is_active?: boolean
  is_verified?: boolean
  created_at?: string
}

export interface AuthResponse {
  id: number
  name: string
  email: string
  username?: string
  role: 'student' | 'lecturer' | 'admin'
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  role: 'student' | 'lecturer'
  username?: string
  studentId?: string
  staffId?: string
  department?: string
  programme?: string
  level?: string
  phone?: string
}

export interface Assignment {
  id: number
  lecturer_id: number
  title: string
  description: string
  due_date: string
  file_path: string | null
  created_at: string
  updated_at: string
}

export interface CreateAssignmentData {
  title: string
  description: string
  due_date: string
}

export interface Submission {
  id: number
  assignment_id: number
  student_id: number
  file_path: string
  original_name: string
  submitted_at: string
  is_late: boolean
}

export interface Grade {
  id: number
  submission_id: number
  score: number
  feedback: string | null
  graded_at: string
}

export interface ApiError {
  error: string
  details?: string
}
