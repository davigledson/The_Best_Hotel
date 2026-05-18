import { useNavigate } from 'react-router-dom'
import { CalendarCheck, BedDouble, ArrowRight } from 'lucide-react'

const cards = [
  {
    icon: CalendarCheck,
    title: 'Minhas reservas',
    description: 'Visualize, crie e cancele suas reservas no hotel.',
    to: '/client/bookings',
    cta: 'Ver reservas',
  },
  {
    icon: BedDouble,
    title: 'Minha estadia',
    description: 'Acompanhe sua estadia atual e os consumos registrados.',
    to: '/client/stay',
    cta: 'Ver estadia',
  },
]

export function ClientHome() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-10 text-center px-4">
      {/* Boas-vindas */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center">
          <BedDouble size={28} className="text-zinc-900" />
        </div>
        <h1 className="text-3xl font-semibold text-zinc-800">Bem-vindo ao The Best Hotel</h1>
        <p className="text-zinc-400 text-sm max-w-md">
          Gerencie suas reservas e acompanhe sua estadia de forma simples e rapida.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        {cards.map(({ icon: Icon, title, description, to, cta }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex flex-col items-start gap-3 bg-white border border-zinc-100 hover:border-amber-300 hover:shadow-sm rounded-xl p-5 text-left transition-all group"
          >
            <div className="p-2 bg-zinc-100 group-hover:bg-amber-50 rounded-lg transition-colors">
              <Icon size={20} className="text-zinc-500 group-hover:text-amber-500 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800">{title}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-500 font-medium mt-auto">
              {cta}
              <ArrowRight size={13} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}