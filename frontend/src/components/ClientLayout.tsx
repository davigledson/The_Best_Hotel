import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { CalendarCheck, BedDouble, Hotel, UtensilsCrossed, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { label: 'Minhas Reservas', icon: CalendarCheck, to: '/client/bookings' },
  { label: 'Minha Estadia', icon: BedDouble, to: '/client/stay' },
  { label: 'Consumos', icon: UtensilsCrossed, to: '/client/consumos' },
]

export function ClientLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden">
      <aside className="flex flex-col h-screen w-60 bg-zinc-900 text-white shrink-0">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800">
          <Hotel className="text-amber-400 shrink-0" size={24} />
          <div>
            <span className="font-semibold text-sm text-white">The Best Hotel</span>
            <p className="text-xs text-zinc-500">Portal do cliente</p>
          </div>
        </div>

        <nav className="flex-1 py-4">
          <ul className="flex flex-col gap-1 px-2">
            {navItems.map(({ label, icon: Icon, to }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                    ${isActive
                      ? 'bg-amber-400 text-zinc-900 font-medium'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-4 py-4 border-t border-zinc-800 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
