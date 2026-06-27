import { createContext, useState, useEffect, type ReactNode } from 'react'
import type { User, LoginCredentials, AuthResponse } from '@/types'
import api from '@/services/api'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<AuthResponse>
  updateUser: (patch: Partial<User>) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (credentials: LoginCredentials) => {
    const { data } = await api.post('/auth/login', credentials)
    const loggedInUser = {
      id: data.id, name: data.name, email: data.email, username: data.username,
      role: data.role, mustChangePassword: !!data.mustChangePassword,
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(loggedInUser))
    setToken(data.token)
    setUser(loggedInUser)
    return data
  }

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
