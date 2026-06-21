import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../lib/api'

interface User { id: number; name: string; email: string }
interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  resetPassword: (email: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const s = localStorage.getItem('user')
    return s ? JSON.parse(s) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me').then(r => {
        setUser(r.data)
        localStorage.setItem('user', JSON.stringify(r.data))
      }).catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const r = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', r.data.token)
    localStorage.setItem('user', JSON.stringify(r.data.user))
    setUser(r.data.user)
  }

  const register = async (name: string, email: string, password: string) => {
    const r = await api.post('/auth/register', { name, email, password })
    localStorage.setItem('token', r.data.token)
    localStorage.setItem('user', JSON.stringify(r.data.user))
    setUser(r.data.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const resetPassword = async (email: string, newPassword: string) => {
    await api.post('/auth/reset-password', { email, newPassword })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}
