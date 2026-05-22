import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { CalendarCheck, LogIn, LogOut, BedDouble, Hotel, ShoppingBasket, ClipboardList } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { label: 'Reservas', icon: CalendarCheck, to: '/employee/reservas' },
  { label: 'Check-in', icon: LogIn, to: '/employee/checkin' },
  { label: 'Check-out', icon: LogOut, to: '/employee/checkout' },
  { label: 'Estadias', icon: ClipboardList, to: '/employee/estadias' },
  { label: 'Quartos', icon: BedDouble, to: '/employee/quartos' },
  { label: 'Produtos', icon: ShoppingBasket, to: '/employee/produtos' },
]

export function EmployeeLayout() {
  const { logout } = useAuth()
  const location = useLocation()

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden">
      <aside className="flex flex-col h-screen w-60 bg-zinc-900 text-white shrink-0">
        <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800">
          <Hotel className="text-amber-400 shrink-0" size={24} />
          <div>
            <span className="font-semibold text-sm text-white">The Best Hotel</span>
            <p className="text-xs text-zinc-500">Funcionario</p>
          </div>
        </div>

        <nav className="flex-1 py-4">
          <ul className="flex flex-col gap-1 px-2">
            {navItems.map(({ label, icon: Icon, to }) => {
              const isActive =
                to === '/employee/' ? location.pathname === '/employee/' : location.pathname.startsWith(to)

              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                      ${isActive
                        ? 'bg-amber-400 text-zinc-900 font-medium'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-4 border-t border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
