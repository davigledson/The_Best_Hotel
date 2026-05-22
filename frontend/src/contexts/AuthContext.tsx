import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { customInstance } from '../lib/axios'

interface AuthUser {
  email: string
  role: 'ADMIN' | 'EMPLOYEE' | 'CLIENT'
  refId: string | null
}

interface RegisterData {
  name: string
  email: string
  password: string
  cpf: string
  phone?: string
  address?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const STORAGE_KEY = 'thebesthotel_auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setToken(parsed.token)
        setUser({ email: parsed.email, role: parsed.role, refId: parsed.refId })
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await customInstance<{ token: string; email: string; role: string; refId: string | null }>({
      url: '/auth/login',
      method: 'POST',
      data: { email, password },
    })

    const authData = {
      token: res.token,
      email: res.email,
      role: res.role,
      refId: res.refId,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData))
    setToken(res.token)
    setUser({ email: res.email, role: res.role as AuthUser['role'], refId: res.refId })
  }, [])

  const register = useCallback(async (data: RegisterData) => {
    const res = await customInstance<{ token: string; email: string; role: string; refId: string | null }>({
      url: '/auth/register',
      method: 'POST',
      data,
    })

    const authData = {
      token: res.token,
      email: res.email,
      role: res.role,
      refId: res.refId,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(authData))
    setToken(res.token)
    setUser({ email: res.email, role: res.role as AuthUser['role'], refId: res.refId })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
