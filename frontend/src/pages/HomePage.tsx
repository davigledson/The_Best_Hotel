import { useNavigate } from 'react-router-dom'
import { Hotel, BedDouble, ShoppingBasket, CalendarCheck, ArrowRight } from 'lucide-react'

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

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Navbar */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <Hotel size={22} className="text-amber-400" />
          <span className="font-semibold text-zinc-800 text-sm">The Best Hotel</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/client')}
            className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Area do cliente
          </button>
          <button
            onClick={() => navigate('/admin')}
            className="text-sm font-medium bg-zinc-900 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Painel admin
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-col items-center justify-center flex-1 text-center px-6 py-20 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center mb-2">
          <Hotel size={32} className="text-zinc-900" />
        </div>
        <div className="flex flex-col gap-3 max-w-lg">
          <h1 className="text-4xl font-semibold text-zinc-800 leading-tight">
            Bem-vindo ao<br />
            <span className="text-amber-400">The Best Hotel</span>
          </h1>
          <p className="text-zinc-400 text-base">
            Conforto, praticidade e atendimento de qualidade para tornar sua estadia inesquecivel.
          </p>
        </div>
        <button
          onClick={() => navigate('/client')}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-6 py-3 rounded-lg transition-colors mt-2"
        >
          Acessar area do cliente
          <ArrowRight size={16} />
        </button>
      </main>

      {/* Features */}
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

      {/* Footer */}
      <footer className="text-center py-5 text-xs text-zinc-300 border-t border-zinc-100 bg-white">
        © {new Date().getFullYear()} The Best Hotel. Todos os direitos reservados.
      </footer>
    </div>
  )
}