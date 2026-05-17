import { BedDouble, Users, UserCog, ShoppingBasket, CalendarCheck, LogIn, TrendingUp, Activity } from 'lucide-react'
import { useFindAll1 } from '../services/room-controller/room-controller'
import { useFindAll4 } from '../services/client-controller/client-controller'
import { useFindAll3 } from '../services/employee-controller/employee-controller'
import { useFindAll2 } from '../services/product-controller/product-controller'
import { useFindAll5 } from '../services/booking-controller/booking-controller'
import { useFindAll6 } from '../services/stay-controller/stay-controller'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  sub?: string
}

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-800">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

interface ProgressBarProps {
  label: string
  value: number
  total: number
  color: string
}

function ProgressBar({ label, value, total, color }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600">{label}</span>
        <span className="font-medium text-zinc-800">{value} <span className="text-zinc-400 font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function formatDate(date?: string) {
  if (!date) return '—'
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export function Dashboard() {
  const { data: rooms = [], isLoading: loadingRooms } = useFindAll1()
  const { data: clients = [], isLoading: loadingClients } = useFindAll4()
  const { data: employees = [], isLoading: loadingEmployees } = useFindAll3()
  const { data: products = [], isLoading: loadingProducts } = useFindAll2()
  const { data: bookings = [], isLoading: loadingBookings } = useFindAll5()
  const { data: stays = [], isLoading: loadingStays } = useFindAll6()

  const isLoading = loadingRooms || loadingClients || loadingEmployees || loadingProducts || loadingBookings || loadingStays

  const roomsAvailable = rooms.filter((r) => r.status === 'AVAILABLE').length
  const roomsOccupied = rooms.filter((r) => r.status === 'OCCUPIED').length
  const roomsMaintenance = rooms.filter((r) => r.status === 'MAINTENANCE').length

  const bookingsPending = bookings.filter((b) => b.status === 'PENDING').length
  const bookingsConfirmed = bookings.filter((b) => b.status === 'CONFIRMED').length
  const bookingsCancelled = bookings.filter((b) => b.status === 'CANCELLED').length
  const bookingsCheckin = bookings.filter((b) => b.status === 'CHECKIN').length
  const bookingsCheckout = bookings.filter((b) => b.status === 'CHECKOUT').length

  const activeStays = stays.filter((s) => s.status === 'ACTIVE')
  const activeProducts = products.filter((p) => p.active).length

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5)

  const bookingStatusConfig: Record<string, { label: string; color: string }> = {
    PENDING:   { label: 'Pendente',   color: 'bg-yellow-100 text-yellow-700' },
    CONFIRMED: { label: 'Confirmada', color: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelada',  color: 'bg-red-100 text-red-600' },
    CHECKIN:   { label: 'Check-in',   color: 'bg-blue-100 text-blue-700' },
    CHECKOUT:  { label: 'Check-out',  color: 'bg-zinc-100 text-zinc-600' },
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
        Carregando...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Visao geral do hotel</p>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Estadias ativas"
          value={activeStays.length}
          icon={<Activity size={18} className="text-blue-600" />}
          color="bg-blue-50"
          sub={`de ${rooms.length} quartos`}
        />
        <StatCard
          label="Reservas"
          value={bookings.length}
          icon={<CalendarCheck size={18} className="text-amber-600" />}
          color="bg-amber-50"
          sub={`${bookingsPending} pendentes`}
        />
        <StatCard
          label="Clientes"
          value={clients.length}
          icon={<Users size={18} className="text-green-600" />}
          color="bg-green-50"
          sub="cadastrados"
        />
        <StatCard
          label="Produtos ativos"
          value={activeProducts}
          icon={<ShoppingBasket size={18} className="text-purple-600" />}
          color="bg-purple-50"
          sub={`de ${products.length} total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ocupacao de quartos */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BedDouble size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Ocupacao de quartos</p>
          </div>
          <div className="flex flex-col gap-3">
            <ProgressBar label="Disponiveis" value={roomsAvailable} total={rooms.length} color="bg-green-400" />
            <ProgressBar label="Ocupados" value={roomsOccupied} total={rooms.length} color="bg-blue-400" />
            <ProgressBar label="Manutencao" value={roomsMaintenance} total={rooms.length} color="bg-yellow-400" />
          </div>
          <div className="border-t border-zinc-50 pt-3 flex justify-between text-sm text-zinc-500">
            <span>Total de quartos</span>
            <span className="font-medium text-zinc-800">{rooms.length}</span>
          </div>
        </div>

        {/* Status de reservas */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Status de reservas</p>
          </div>
          <div className="flex flex-col gap-3">
            <ProgressBar label="Pendentes" value={bookingsPending} total={bookings.length} color="bg-yellow-400" />
            <ProgressBar label="Confirmadas" value={bookingsConfirmed} total={bookings.length} color="bg-green-400" />
            <ProgressBar label="Check-in" value={bookingsCheckin} total={bookings.length} color="bg-blue-400" />
            <ProgressBar label="Check-out" value={bookingsCheckout} total={bookings.length} color="bg-zinc-400" />
            <ProgressBar label="Canceladas" value={bookingsCancelled} total={bookings.length} color="bg-red-400" />
          </div>
          <div className="border-t border-zinc-50 pt-3 flex justify-between text-sm text-zinc-500">
            <span>Total de reservas</span>
            <span className="font-medium text-zinc-800">{bookings.length}</span>
          </div>
        </div>

        {/* Resumo rapido */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <LogIn size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Resumo rapido</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Funcionarios', value: employees.length, icon: <UserCog size={15} className="text-zinc-400" /> },
              { label: 'Quartos livres', value: roomsAvailable, icon: <BedDouble size={15} className="text-green-400" /> },
              { label: 'Em manutencao', value: roomsMaintenance, icon: <BedDouble size={15} className="text-yellow-400" /> },
              { label: 'Estadias ativas', value: activeStays.length, icon: <Activity size={15} className="text-blue-400" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="flex items-center gap-2.5 bg-zinc-50 rounded-lg p-3">
                {icon}
                <div>
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="text-base font-semibold text-zinc-800">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ultimas reservas */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Ultimas reservas</p>
          </div>
          {recentBookings.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">Nenhuma reserva cadastrada</p>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-50">
              {recentBookings.map((b, i) => {
                const status = bookingStatusConfig[b.status ?? ''] ?? { label: b.status, color: 'bg-zinc-100 text-zinc-500' }
                return (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-zinc-700">
                        {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}
                      </span>
                      <span className="text-xs text-zinc-400">
                        R$ {b.dailyRate?.toFixed(2)}/dia
                      </span>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}