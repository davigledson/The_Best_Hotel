import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Hotel, BedDouble, ShoppingBasket, CalendarCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const features = [
  {
    icon: CalendarCheck,
    title: 'Reservas online',
    description: 'Faça e gerencie suas reservas de qualquer lugar, a qualquer hora.',
  },
  {
    icon: BedDouble,
    title: 'Quartos confortaveis',
    description: 'Quartos equipados e pensados para o seu descanso e conforto.',
  },
  {
    icon: ShoppingBasket,
    title: 'Servicos inclusos',
    description: 'Acompanhe seus consumos durante a estadia em tempo real.',
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, user, login, logout } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
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

  function goToDashboard() {
    if (user?.role === 'ADMIN') navigate('/admin')
    else if (user?.role === 'EMPLOYEE') navigate('/employee')
    else navigate('/client')
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Hotel size={22} className="text-amber-400" />
          <span className="font-semibold text-zinc-800 text-sm">The Best Hotel</span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button
                onClick={goToDashboard}
                className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                Ir para o painel
              </button>
              <button
                onClick={() => { logout(); navigate('/') }}
                className="text-sm font-medium bg-zinc-900 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <span className="text-sm text-zinc-400">Bem-vindo</span>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 py-12 lg:py-20 gap-12 lg:gap-16">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center">
            <Hotel size={32} className="text-zinc-900" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl lg:text-5xl font-semibold text-zinc-800 leading-tight">
              Bem-vindo ao<br />
              <span className="text-amber-400">The Best Hotel</span>
            </h1>
            <p className="text-zinc-400 text-base leading-relaxed">
              Conforto, praticidade e atendimento de qualidade para tornar sua estadia inesquecivel.
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm shrink-0">
          {isAuthenticated ? (
            <div className="bg-white rounded-xl border border-zinc-100 p-8 flex flex-col items-center gap-5 text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-lg font-bold">✓</span>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Conectado como</p>
                <p className="text-base font-semibold text-zinc-800">{user?.email}</p>
              </div>
              <button
                onClick={goToDashboard}
                className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-6 py-3 rounded-lg transition-colors"
              >
                Ir para o painel
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="bg-white rounded-xl border border-zinc-100 p-8 flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-800">Acessar sistema</h2>
                <p className="text-sm text-zinc-400">Informe seus dados para entrar</p>
              </div>

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
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
                    className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-200 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <p className="text-xs text-zinc-400 text-center">
                Nao tem conta?{' '}
                <Link to="/register" className="text-amber-600 hover:text-amber-700 font-medium">Cadastre-se</Link>
              </p>

              <div className="flex flex-col gap-1 text-center">
                <p className="text-xs text-zinc-400">Contas de teste:</p>
                <p className="text-xs text-zinc-300">admin@gmail.com / admin123</p>
                <p className="text-xs text-zinc-300">funcionario@gmail.com / func123</p>
                <p className="text-xs text-zinc-300">cliente@gmail.com / cliente123</p>
              </div>
            </form>
          )}
        </div>
      </main>

      <section className="px-8 py-16 bg-white border-t border-zinc-100">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-center text-center gap-3">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Icon size={22} className="text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-zinc-800">{title}</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-5 text-xs text-zinc-300 border-t border-zinc-100 bg-white">
        © {new Date().getFullYear()} The Best Hotel. Todos os direitos reservados.
      </footer>
    </div>
  )
}
