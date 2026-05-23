import { BedDouble, Users, ShoppingBasket, CalendarCheck, LogIn, TrendingUp, Activity, DollarSign, XCircle, PackageCheck, Clock } from 'lucide-react'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { useFindAll4 } from '../../services/client-controller/client-controller'
import { useFindAll2 } from '../../services/product-controller/product-controller'
import { useFindAll5 } from '../../services/booking-controller/booking-controller'
import { useFindAll6 } from '../../services/stay-controller/stay-controller'
import type { Consumption } from '../../services/openAPIDefinition.schemas'

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
  showPercent?: boolean
}

function ProgressBar({ label, value, total, color, showPercent = true }: ProgressBarProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600">{label}</span>
        <span className="font-medium text-zinc-800">{value}{showPercent ? <span className="text-zinc-400 font-normal"> ({pct}%)</span> : null}</span>
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

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function Dashboard() {
  const { data: rooms = [], isLoading: loadingRooms } = useFindAll1()
  const { data: clients = [], isLoading: loadingClients } = useFindAll4()
  const { data: products = [], isLoading: loadingProducts } = useFindAll2()
  const { data: bookings = [], isLoading: loadingBookings } = useFindAll5()
  const { data: stays = [], isLoading: loadingStays } = useFindAll6()

  const isLoading = loadingRooms || loadingClients || loadingProducts || loadingBookings || loadingStays

  const bookingsPending = bookings.filter((b) => b.status === 'PENDING').length
  const bookingsConfirmed = bookings.filter((b) => b.status === 'CONFIRMED').length
  const bookingsCancelled = bookings.filter((b) => b.status === 'CANCELLED').length
  const bookingsCheckin = bookings.filter((b) => b.status === 'CHECKIN').length
  const bookingsCheckout = bookings.filter((b) => b.status === 'CHECKOUT').length

  const activeStays = stays.filter((s) => s.status === 'ACTIVE')
  const closedStays = stays.filter((s) => s.status === 'CLOSED')
  const activeProducts = products.filter((p) => p.active).length

  // Financial data
  const totalRevenue = closedStays.reduce((sum, s) => sum + (s.grandTotal ?? 0), 0)
  const totalConsumptionRevenue = closedStays.reduce((sum, s) => sum + (s.totalConsumptions ?? 0), 0)
  const totalDailiesRevenue = closedStays.reduce((sum, s) => sum + (s.totalDailies ?? 0), 0)
  const avgTicket = closedStays.length > 0 ? totalRevenue / closedStays.length : 0

  // Consumption stats across all stays
  const allConsumptions: Consumption[] = stays.flatMap((s) => s.consumptions ?? [])
  const totalItems = allConsumptions.length
  const deliveredItems = allConsumptions.filter((c) => c.deliveryStatus === 'DELIVERED').length
  const cancelledItems = allConsumptions.filter((c) => c.deliveryStatus === 'CANCELLED').length
  const pendingItems = allConsumptions.filter(
    (c) => c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED'
  ).length

  // Top 5 most ordered products
  const productCounts: Record<string, { name: string; qty: number; total: number }> = {}
  allConsumptions.forEach((c) => {
    const key = c.productName ?? 'unknown'
    if (!productCounts[key]) productCounts[key] = { name: c.productName ?? '', qty: 0, total: 0 }
    productCounts[key].qty += c.quantity ?? 0
    productCounts[key].total += (c.quantity ?? 0) * (c.unitPrice ?? 0)
  })
  const topProducts = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 5)

  // Room occupancy by type
  const roomTypes: Record<string, { label: string; total: number; available: number; occupied: number; maintenance: number }> = {}
  rooms.forEach((r) => {
    const t = r.type ?? 'Outro'
    if (!roomTypes[t]) roomTypes[t] = { label: t, total: 0, available: 0, occupied: 0, maintenance: 0 }
    roomTypes[t].total++
    if (r.status === 'AVAILABLE') roomTypes[t].available++
    else if (r.status === 'OCCUPIED') roomTypes[t].occupied++
    else if (r.status === 'MAINTENANCE') roomTypes[t].maintenance++
  })

  // Today's activities
  const today = todayStr()
  const todayCheckins = bookings.filter((b) => b.checkInDate === today && b.status !== 'CANCELLED')
  const todayCheckouts = bookings.filter((b) => b.checkOutDate === today && b.status !== 'CANCELLED')

  // Recent bookings (keep existing)
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
        <StatCard label="Estadias ativas" value={activeStays.length} icon={<Activity size={18} className="text-blue-600" />} color="bg-blue-50" sub={`de ${rooms.length} quartos`} />
        <StatCard label="Reservas" value={bookings.length} icon={<CalendarCheck size={18} className="text-amber-600" />} color="bg-amber-50" sub={`${bookingsPending} pendentes`} />
        <StatCard label="Clientes" value={clients.length} icon={<Users size={18} className="text-green-600" />} color="bg-green-50" sub="cadastrados" />
        <StatCard label="Produtos ativos" value={activeProducts} icon={<ShoppingBasket size={18} className="text-purple-600" />} color="bg-purple-50" sub={`de ${products.length} total`} />
      </div>

      {/* Cards financeiros */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} className="text-green-500" />
          <p className="font-medium text-zinc-700 text-sm">Financeiro</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Receita total" value={`R$ ${totalRevenue.toFixed(2)}`} icon={<DollarSign size={18} className="text-green-600" />} color="bg-green-50" sub={`${closedStays.length} estadias`} />
          <StatCard label="Consumos" value={`R$ ${totalConsumptionRevenue.toFixed(2)}`} icon={<ShoppingBasket size={18} className="text-amber-600" />} color="bg-amber-50" sub={`${((totalConsumptionRevenue / (totalRevenue || 1)) * 100).toFixed(0)}% da receita`} />
          <StatCard label="Diarias" value={`R$ ${totalDailiesRevenue.toFixed(2)}`} icon={<BedDouble size={18} className="text-blue-600" />} color="bg-blue-50" sub={`${((totalDailiesRevenue / (totalRevenue || 1)) * 100).toFixed(0)}% da receita`} />
          <StatCard label="Ticket medio" value={`R$ ${avgTicket.toFixed(2)}`} icon={<TrendingUp size={18} className="text-purple-600" />} color="bg-purple-50" sub="por estadia" />
        </div>
      </div>

      {/* Cards de consumo */}
      {totalItems > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PackageCheck size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-700 text-sm">Consumos</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total de itens" value={totalItems} icon={<ShoppingBasket size={18} className="text-zinc-600" />} color="bg-zinc-50" />
            <StatCard label="Entregues" value={deliveredItems} icon={<PackageCheck size={18} className="text-green-600" />} color="bg-green-50" sub={`${totalItems > 0 ? Math.round((deliveredItems / totalItems) * 100) : 0}%`} />
            <StatCard label="Pendentes" value={pendingItems} icon={<Clock size={18} className="text-yellow-600" />} color="bg-yellow-50" sub={`${totalItems > 0 ? Math.round((pendingItems / totalItems) * 100) : 0}%`} />
            <StatCard label="Cancelados" value={cancelledItems} icon={<XCircle size={18} className="text-red-500" />} color="bg-red-50" sub={`${totalItems > 0 ? Math.round((cancelledItems / totalItems) * 100) : 0}%`} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ocupacao por tipo de quarto */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BedDouble size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Ocupacao por tipo de quarto</p>
          </div>
          <div className="flex flex-col gap-4">
            {Object.entries(roomTypes).map(([type, data]) => (
              <div key={type} className="flex flex-col gap-2">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{type}</p>
                <ProgressBar label="Disponiveis" value={data.available} total={data.total} color="bg-green-400" />
                <ProgressBar label="Ocupados" value={data.occupied} total={data.total} color="bg-blue-400" />
                <ProgressBar label="Manutencao" value={data.maintenance} total={data.total} color="bg-yellow-400" />
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-50 pt-3 flex justify-between text-sm text-zinc-500">
            <span>Total de quartos</span>
            <span className="font-medium text-zinc-800">{rooms.length}</span>
          </div>
        </div>

        {/* Delivery status breakdown */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <PackageCheck size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Status de entrega</p>
          </div>
          {totalItems === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">Nenhum item consumido</p>
          ) : (
            <div className="flex flex-col gap-3">
              <ProgressBar label="Entregues" value={deliveredItems} total={totalItems} color="bg-green-400" />
              <ProgressBar label="Pendentes" value={pendingItems} total={totalItems} color="bg-yellow-400" />
              <ProgressBar label="Cancelados" value={cancelledItems} total={totalItems} color="bg-red-400" />
            </div>
          )}
          <div className="border-t border-zinc-50 pt-3 flex justify-between text-sm text-zinc-500">
            <span>Total de itens</span>
            <span className="font-medium text-zinc-800">{totalItems}</span>
          </div>
        </div>

        {/* Atividades de hoje */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Atividades de hoje</p>
          </div>
          {todayCheckins.length === 0 && todayCheckouts.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">Nenhuma atividade prevista para hoje</p>
          ) : (
            <div className="flex flex-col gap-3">
              {todayCheckins.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wide flex items-center gap-1.5">
                    <LogIn size={12} /> Check-ins ({todayCheckins.length})
                  </p>
                  {todayCheckins.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-green-50 rounded-lg px-3 py-2">
                      <span className="text-zinc-700">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</span>
                      <span className="text-xs font-medium text-green-700">R$ {b.dailyRate?.toFixed(2)}/dia</span>
                    </div>
                  ))}
                </div>
              )}
              {todayCheckouts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide flex items-center gap-1.5">
                    <LogIn size={12} className="rotate-180" /> Check-outs ({todayCheckouts.length})
                  </p>
                  {todayCheckouts.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-blue-50 rounded-lg px-3 py-2">
                      <span className="text-zinc-700">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</span>
                      <span className="text-xs font-medium text-blue-700">R$ {b.dailyRate?.toFixed(2)}/dia</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Produtos mais pedidos */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <ShoppingBasket size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Produtos mais pedidos</p>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-zinc-400 py-4 text-center">Nenhum consumo registrado</p>
          ) : (
            <div className="flex flex-col gap-2">
              {topProducts.map((p, i) => {
                const maxQty = topProducts[0].qty
                const pct = Math.round((p.qty / maxQty) * 100)
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-zinc-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-sm text-zinc-700 min-w-0 truncate flex-1">{p.name}</span>
                      <span className="text-xs text-zinc-400 w-16 text-right">{p.qty} un.</span>
                      <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden shrink-0">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {allConsumptions.length > 0 && (
            <div className="border-t border-zinc-50 pt-3 flex justify-between text-sm text-zinc-500">
              <span>Valor total em consumos</span>
              <span className="font-medium text-zinc-800">
                R$ {allConsumptions.reduce((sum, c) => sum + (c.unitPrice ?? 0) * (c.quantity ?? 0), 0).toFixed(2)}
              </span>
            </div>
          )}
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
