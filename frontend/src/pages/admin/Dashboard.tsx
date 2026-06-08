import { BedDouble, Users, ShoppingBasket, CalendarCheck, LogIn, TrendingUp, DollarSign, PackageCheck, Check, X, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
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

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const PIE_COLORS = ['#FFBA00', '#365943', '#3B82F6', '#D75103', '#EF4444']

const bookingStatusConfig: Record<string, { label: string; color: string; border: string }> = {
  PENDING:   { label: 'Pendente',   color: 'bg-yellow-100 text-yellow-700',   border: 'border-l-yellow-400' },
  CONFIRMED: { label: 'Confirmada', color: 'bg-verde/10 text-verde',          border: 'border-l-green-500' },
  CANCELLED: { label: 'Cancelada',  color: 'bg-red-100 text-red-600',         border: 'border-l-red-400' },
  CHECKIN:   { label: 'Check-in',   color: 'bg-blue-100 text-blue-700',       border: 'border-l-blue-500' },
  CHECKOUT:  { label: 'Check-out',  color: 'bg-zinc-100 text-zinc-600',       border: 'border-l-zinc-400' },
}

function monthKey(dateStr?: string) {
  if (!dateStr) return ''
  return dateStr.slice(0, 7)
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

  const totalRevenue = closedStays.reduce((sum, s) => sum + (s.grandTotal ?? 0), 0)
  const totalConsumptionRevenue = closedStays.reduce((sum, s) => sum + (s.totalConsumptions ?? 0), 0)
  const totalDailiesRevenue = closedStays.reduce((sum, s) => sum + (s.totalDailies ?? 0), 0)
  const avgTicket = closedStays.length > 0 ? totalRevenue / closedStays.length : 0

  const allConsumptions: Consumption[] = stays.flatMap((s) => s.consumptions ?? [])
  const totalItems = allConsumptions.length
  const deliveredItems = allConsumptions.filter((c) => c.deliveryStatus === 'DELIVERED').length
  const cancelledItems = allConsumptions.filter((c) => c.deliveryStatus === 'CANCELLED').length
  const pendingItems = allConsumptions.filter(
    (c) => c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED'
  ).length

  const productCounts: Record<string, { name: string; qty: number; total: number }> = {}
  allConsumptions.forEach((c) => {
    const key = c.productName ?? 'unknown'
    if (!productCounts[key]) productCounts[key] = { name: c.productName ?? '', qty: 0, total: 0 }
    productCounts[key].qty += c.quantity ?? 0
    productCounts[key].total += (c.quantity ?? 0) * (c.unitPrice ?? 0)
  })
  const topProducts = Object.values(productCounts).sort((a, b) => b.qty - a.qty).slice(0, 10)

  const roomTypes: Record<string, { label: string; total: number; available: number; occupied: number; maintenance: number }> = {}
  rooms.forEach((r) => {
    const label = r.type ?? 'Outro'
    if (!roomTypes[label]) roomTypes[label] = { label, total: 0, available: 0, occupied: 0, maintenance: 0 }
    roomTypes[label].total++
    if (r.status === 'AVAILABLE') roomTypes[label].available++
    else if (r.status === 'OCCUPIED') roomTypes[label].occupied++
    else if (r.status === 'MAINTENANCE') roomTypes[label].maintenance++
  })

  const today = todayStr()
  const todayCheckins = bookings.filter((b) => b.checkInDate === today && b.status !== 'CANCELLED')
  const todayCheckouts = bookings.filter((b) => b.checkOutDate === today && b.status !== 'CANCELLED')

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 5)

  // Monthly revenue
  const monthlyData: Record<string, { month: string; diarias: number; consumos: number }> = {}
  closedStays.forEach((s) => {
    const mk = monthKey(s.checkInAt)
    if (!mk) return
    if (!monthlyData[mk]) {
      const [y, m] = mk.split('-')
      monthlyData[mk] = { month: `${MONTH_NAMES[parseInt(m) - 1]}/${y.slice(2)}`, diarias: 0, consumos: 0 }
    }
    monthlyData[mk].diarias += s.totalDailies ?? 0
    monthlyData[mk].consumos += s.totalConsumptions ?? 0
  })
  const revenueChartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))

  // Booking status pie data
  const bookingPieData = [
    { name: 'Pendentes', value: bookingsPending },
    { name: 'Confirmadas', value: bookingsConfirmed },
    { name: 'Check-in', value: bookingsCheckin },
    { name: 'Check-out', value: bookingsCheckout },
    { name: 'Canceladas', value: bookingsCancelled },
  ].filter((d) => d.value > 0)

  // Room occupancy stacked data
  const roomChartData = Object.entries(roomTypes).map(([, data]) => ({
    name: data.label,
    Disponiveis: data.available,
    Ocupados: data.occupied,
    Manutencao: data.maintenance,
  }))

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
        <StatCard label="Estadias ativas" value={activeStays.length} icon={<BedDouble size={18} className="text-blue-600" />} color="bg-blue-50" sub={`de ${rooms.length} quartos`} />
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

      {/* Receita mensal */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-amber-500" />
          <p className="font-medium text-zinc-800 text-sm">Receita mensal</p>
        </div>
        {revenueChartData.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">Nenhuma estadia fechada</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#a1a1aa' }} />
              <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} tickFormatter={(v: number) => `R$${v}`} />
              <Tooltip
                contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e4e4e7' }}
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, undefined]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="diarias" name="Diarias" fill="#365943" radius={[4, 4, 0, 0]} />
              <Bar dataKey="consumos" name="Consumos" fill="#D75103" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Status de reservas (Pie) */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarCheck size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Status de reservas</p>
          </div>
          {bookingPieData.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Nenhuma reserva</p>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={bookingPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {bookingPieData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e4e4e7' }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Ocupacao por tipo de quarto (Stacked Bar) */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BedDouble size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Ocupacao por tipo de quarto</p>
          </div>
          {roomChartData.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Nenhum quarto cadastrado</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={roomChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <YAxis tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e4e4e7' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Disponiveis" name="Disponiveis" stackId="a" fill="#365943" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Ocupados" name="Ocupados" stackId="a" fill="#FFBA00" />
                <Bar dataKey="Manutencao" name="Manutencao" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Produtos mais pedidos (Horizontal Bar) */}
        <div className="bg-white rounded-xl border border-zinc-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBasket size={16} className="text-amber-500" />
            <p className="font-medium text-zinc-800 text-sm">Produtos mais pedidos</p>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-zinc-400 py-8 text-center">Nenhum consumo registrado</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, topProducts.length * 36)}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} width={110} />
                <Tooltip
                  contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e4e4e7' }}
                  formatter={(value: number) => [`${value} un.`, undefined]}
                />
                <Bar dataKey="qty" name="Quantidade" fill="#D75103" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status de entrega */}
        {totalItems > 0 ? (
          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PackageCheck size={16} className="text-amber-500" />
              <p className="font-medium text-zinc-800 text-sm">Status de entrega</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-4 flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Check size={16} className="text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-700">{deliveredItems}</p>
                <p className="text-xs font-medium text-green-600">Entregues</p>
                <p className="text-[10px] text-green-500">{totalItems > 0 ? Math.round((deliveredItems / totalItems) * 100) : 0}% do total</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertCircle size={16} className="text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-700">{pendingItems}</p>
                <p className="text-xs font-medium text-yellow-600">Pendentes</p>
                <p className="text-[10px] text-yellow-500">{totalItems > 0 ? Math.round((pendingItems / totalItems) * 100) : 0}% do total</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <X size={16} className="text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600">{cancelledItems}</p>
                <p className="text-xs font-medium text-red-500">Cancelados</p>
                <p className="text-[10px] text-red-400">{totalItems > 0 ? Math.round((cancelledItems / totalItems) * 100) : 0}% do total</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-100 p-5 flex items-center justify-center">
            <p className="text-sm text-zinc-400">Nenhum consumo registrado</p>
          </div>
        )}

      </div>

      {/* Atividades de hoje (full width) */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck size={16} className="text-amber-500" />
          <p className="font-medium text-zinc-800 text-sm">Atividades de hoje</p>
        </div>
        {todayCheckins.length === 0 && todayCheckouts.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">Nenhuma atividade prevista para hoje</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayCheckins.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <LogIn size={14} /> Check-ins ({todayCheckins.length})
                </p>
                {todayCheckins.map((b, i) => (
                  <div key={i} className="border-l-4 border-l-green-500 bg-green-50/60 rounded-r-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-zinc-800">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</span>
                      <span className="text-xs text-green-600 font-medium">R$ {b.rooms?.[0]?.dailyRate?.toFixed(2)}/dia</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {todayCheckouts.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                  <LogIn size={14} className="rotate-180" /> Check-outs ({todayCheckouts.length})
                </p>
                {todayCheckouts.map((b, i) => (
                  <div key={i} className="border-l-4 border-l-blue-500 bg-blue-50/60 rounded-r-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-zinc-800">{formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)}</span>
                      <span className="text-xs text-blue-600 font-medium">R$ {b.rooms?.[0]?.dailyRate?.toFixed(2)}/dia</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ultimas reservas (full width) */}
      <div className="bg-white rounded-xl border border-zinc-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarCheck size={16} className="text-amber-500" />
          <p className="font-medium text-zinc-800 text-sm">Ultimas reservas</p>
        </div>
        {recentBookings.length === 0 ? (
          <p className="text-sm text-zinc-400 py-8 text-center">Nenhuma reserva cadastrada</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {recentBookings.map((b, i) => {
              const status = bookingStatusConfig[b.status ?? ''] ?? { label: b.status, color: 'bg-zinc-100 text-zinc-500', border: 'border-l-zinc-400' }
              return (
                <div key={i} className={`border-l-4 ${status.border} bg-white rounded-xl border border-zinc-100 px-4 py-3 flex flex-col gap-1.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Reserva #{recentBookings.length - i}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-zinc-800">
                      {formatDate(b.checkInDate)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      ate {formatDate(b.checkOutDate)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-zinc-700 mt-1">
                    R$ {b.rooms?.[0]?.dailyRate?.toFixed(2)} <span className="font-normal text-zinc-400">/dia</span>
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
