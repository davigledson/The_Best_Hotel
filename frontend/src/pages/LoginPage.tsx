import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import mainLogo from '../assets/main-logo.png'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)

      const stored = localStorage.getItem('thebesthotel_auth')
      if (stored) {
        const { role } = JSON.parse(stored)
        if (role === 'ADMIN') navigate('/admin')
        else if (role === 'EMPLOYEE') navigate('/employee')
        else navigate('/client')
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } }
        setError(axiosErr.response?.data?.message || 'Erro ao fazer login')
      } else {
        setError('Erro ao fazer login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-branco flex flex-col items-center justify-center w-full px-4 gap-10 py-12">
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <p className="text-sm font-medium text-amber-700">Bem vindo ao</p>
        <img src={mainLogo} alt="The Best Hotel" className="w-full h-auto block" />
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl border border-zinc-100 p-8 flex flex-col gap-6">
        <p className="text-sm text-zinc-400 text-center">Faça login para continuar</p>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-verde"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-verde"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-laranja disabled:bg-amber-200 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="text-xs text-zinc-400 text-center">
            Nao tem conta?{' '}
            <Link to="/register" className="text-amber-600 hover:text-amber-700 font-medium">Cadastre-se</Link>
          </p>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors text-center"
          >
            Voltar ao inicio
          </button>
        </form>
    </div>
  )
}
