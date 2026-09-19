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
  level_scope?: string
  levelScope?: string
  is_active?: boolean
  is_verified?: boolean
  mustChangePassword?: boolean
  created_at?: string
}

export interface AuthResponse {
  id: number
  name: string
  email: string
  username?: string
  role: 'student' | 'lecturer' | 'admin'
  mustChangePassword?: boolean
  token: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface CreateUserData {
  name: string
  email: string
  password: string
  role: 'student' | 'lecturer' | 'admin'
  username?: string
  studentId?: string
  staffId?: string
  department?: string
  programme?: string
  level?: string
  phone?: string
  levelScope?: string
}

export interface Course {
  id: number
  code: string
  title: string
  department?: string
  created_at?: string
  assignment_count?: number
}

export interface Assignment {
  id: number
  lecturer_id: number
  title: string
  description: string
  due_date: string
  file_path: string | null
  course_code?: string
  course_title?: string
  course_id?: number | null
  semester?: string
  target_level?: string
  accept_late_submissions?: boolean
  late_cutoff?: string | null
  publish_date?: string | null
  created_at: string
  updated_at: string
}

export interface CreateAssignmentData {
  title: string
  description: string
  due_date: string
  course_code?: string
  course_title?: string
  course_id?: number
  semester?: string
  target_level?: string
  accept_late_submissions?: boolean
  late_cutoff?: string | null
  publish_date?: string | null
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
