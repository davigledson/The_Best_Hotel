import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, ShoppingBasket, CalendarCheck, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import mainLogo from '../assets/main-logo.png'
import miniLogo from '../assets/mini-logo.svg'

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

function formatCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

function formatPhone(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2')
    .slice(0, 15)
}

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, user, login, register, logout } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [reg, setReg] = useState({ name: '', email: '', password: '', confirmPassword: '', cpf: '', phone: '', address: '' })
  const [showPassword, setShowPassword] = useState(false)

  const setRegField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    if (field === 'cpf') value = formatCPF(value)
    if (field === 'phone') value = formatPhone(value)
    setReg((p) => ({ ...p, [field]: value }))
  }

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (reg.password !== reg.confirmPassword) {
      setError('As senhas nao conferem')
      return
    }

    setLoading(true)

    try {
      await register({
        name: reg.name,
        email: reg.email,
        password: reg.password,
        cpf: reg.cpf,
        phone: reg.phone || undefined,
        address: reg.address || undefined,
      })
      navigate('/client')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } }
        setError(axiosErr.response?.data?.message || 'Erro ao cadastrar')
      } else {
        setError('Erro ao cadastrar')
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

  function switchMode() {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  const inputClass = "w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-verde"

  return (
    <div className="min-h-screen bg-branco flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <img src={miniLogo} alt="The Best Hotel" className="w-5 h-5" />
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

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 items-start px-6 py-12 lg:py-20 gap-12 lg:gap-16">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-5 w-full max-w-4xl">
          <div className="flex flex-col items-center lg:items-start gap-2">
            <p className="text-lg font-semibold text-amber-700 tracking-wide">Bem vindo ao</p>
            <img src={mainLogo} alt="The Best Hotel" className="w-full h-auto block" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-zinc-400 text-base leading-relaxed">
              Conforto, praticidade e atendimento de qualidade para tornar sua estadia inesquecivel.
            </p>
          </div>
        </div>

        <div className="w-full max-w-sm">
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
                className="flex items-center gap-2 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm px-6 py-3 rounded-lg transition-colors"
              >
                Ir para o painel
                <ArrowRight size={16} />
              </button>
            </div>
          ) : mode === 'login' ? (
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
                    className={inputClass}
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
                    className={inputClass}
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
                <button type="button" onClick={switchMode} className="text-amber-600 hover:text-amber-700 font-medium underline cursor-pointer">Cadastre-se</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="bg-white rounded-xl border border-zinc-100 p-8 flex flex-col gap-5">
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-800">Criar sua conta</h2>
                <p className="text-sm text-zinc-400">Preencha os dados para se cadastrar</p>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-center">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Nome completo</label>
                  <input type="text" value={reg.name} onChange={setRegField('name')} placeholder="Seu nome" required className={inputClass} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Email</label>
                  <input type="email" value={reg.email} onChange={setRegField('email')} placeholder="seu@email.com" required className={inputClass} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Senha</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={reg.password} onChange={setRegField('password')}
                      placeholder="••••••••" required className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Confirmar senha</label>
                  <input type={showPassword ? 'text' : 'password'} value={reg.confirmPassword} onChange={setRegField('confirmPassword')}
                    placeholder="••••••••" required className={inputClass} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">CPF</label>
                  <input type="text" value={reg.cpf} onChange={setRegField('cpf')} placeholder="000.000.000-00" required className={inputClass} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Telefone</label>
                  <input type="text" value={reg.phone} onChange={setRegField('phone')} placeholder="(00) 00000-0000" className={inputClass} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Endereco</label>
                  <input type="text" value={reg.address} onChange={setRegField('address')} placeholder="Rua, numero, cidade" className={inputClass} />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-amber-400 hover:bg-laranja disabled:bg-amber-200 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors">
                {loading ? 'Cadastrando...' : 'Cadastrar'}
              </button>

              <p className="text-xs text-zinc-400 text-center">
                Ja tem conta?{' '}
                <button type="button" onClick={switchMode} className="text-amber-600 hover:text-amber-700 font-medium underline cursor-pointer">Faca login</button>
              </p>
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

      <footer className="text-center py-5 text-xs text-white/60 bg-verde">
        © {new Date().getFullYear()} The Best Hotel. Todos os direitos reservados.
      </footer>
    </div>
  )
}
