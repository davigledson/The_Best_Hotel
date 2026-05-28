import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { CalendarCheck, LogIn, LogOut, BedDouble, ShoppingBasket, ClipboardList, ChevronLeft, ChevronRight, DoorOpen } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import miniLogo from '../assets/mini-logo.svg'

const navItems = [
  { label: 'Reservas', icon: CalendarCheck, to: '/employee/reservas' },
  { label: 'Check-in', icon: LogIn, to: '/employee/checkin' },
  { label: 'Check-out', icon: LogOut, to: '/employee/checkout' },
  { label: 'Estadias', icon: ClipboardList, to: '/employee/estadias' },
  { label: 'Quartos', icon: BedDouble, to: '/employee/quartos' },
  { label: 'Produtos', icon: ShoppingBasket, to: '/employee/produtos' },
]

export function EmployeeLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { logout } = useAuth()
  const location = useLocation()

  return (
    <div className="flex h-screen bg-zinc-100 overflow-hidden">
      <aside
        className={`
          flex flex-col h-screen bg-zinc-900 text-white transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-60'}
          shrink-0 relative
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-zinc-800 ${collapsed ? 'justify-center' : ''}`}>
          <img src={miniLogo} alt="The Best Hotel" className="w-6 h-6 shrink-0" />
          {!collapsed && (
            <div>
              <span className="font-semibold text-sm text-white">The Best Hotel</span>
              <p className="text-xs text-zinc-500">Funcionario</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="flex flex-col gap-1 px-2">
            {navItems.map(({ label, icon: Icon, to }) => {
              const isActive =
                to === '/employee/' ? location.pathname === '/employee/' : location.pathname.startsWith(to)

              return (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                      ${collapsed ? 'justify-center' : ''}
                      ${isActive
                        ? 'bg-amber-400 text-zinc-900 font-medium'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                      }
                    `}
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={18} className="shrink-0" />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <button
          onClick={() => { logout(); window.location.href = '/' }}
          className={`flex items-center gap-3 px-3 py-2.5 mx-2 mb-2 rounded-lg text-sm transition-colors text-zinc-500 hover:text-red-400 hover:bg-zinc-800 ${collapsed ? 'justify-center mx-2' : ''}`}
          title="Sair"
        >
          <DoorOpen size={18} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center py-4 border-t border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
