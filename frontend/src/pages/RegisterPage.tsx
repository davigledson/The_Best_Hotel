import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import mainLogo from '../assets/main-logo.png'

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

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', cpf: '', phone: '', address: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    if (field === 'cpf') value = formatCPF(value)
    if (field === 'phone') value = formatPhone(value)
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('As senhas nao conferem')
      return
    }

    setLoading(true)

    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        cpf: form.cpf,
        phone: form.phone || undefined,
        address: form.address || undefined,
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

  const inputClass = "w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-verde"

  return (
    <div className="min-h-screen bg-branco flex flex-col items-center justify-center w-full px-4 gap-10 py-12">
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <p className="text-sm font-medium text-amber-700">Bem vindo ao</p>
        <img src={mainLogo} alt="The Best Hotel" className="w-full h-auto block" />
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl border border-zinc-100 p-8 flex flex-col gap-5">
        <p className="text-sm text-zinc-400 text-center">Criar sua conta</p>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Nome completo</label>
              <input type="text" value={form.name} onChange={set('name')} placeholder="Seu nome" required className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com" required className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Senha</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  placeholder="••••••••" required className={`${inputClass} pr-10`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Confirmar senha</label>
              <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')}
                placeholder="••••••••" required className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">CPF</label>
              <input type="text" value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" required className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Telefone</label>
              <input type="text" value={form.phone} onChange={set('phone')} placeholder="(00) 00000-0000" className={inputClass} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Endereco</label>
              <input type="text" value={form.address} onChange={set('address')} placeholder="Rua, numero, cidade" className={inputClass} />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-amber-400 hover:bg-laranja disabled:bg-amber-200 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors">
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>

          <p className="text-xs text-zinc-400 text-center">
            Ja tem conta?{' '}
            <Link to="/login" className="text-amber-600 hover:text-amber-700 font-medium">Faca login</Link>
          </p>
        </form>
    </div>
  )
}
