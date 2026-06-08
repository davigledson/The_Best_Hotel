import { useQuery } from '@tanstack/react-query'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { useFindById6 } from '../../services/booking-controller/booking-controller'
import { customInstance } from '../../lib/axios'
import { BedDouble, ShoppingBasket, Receipt, CalendarDays, DoorOpen, Clock } from 'lucide-react'
import type { Stay } from '../../services/openAPIDefinition.schemas'

function getId(obj: unknown): string {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  if (obj && typeof obj === 'object' && '$oid' in (obj as any)) return (obj as any).$oid
  return String(obj)
}

const statusLabel: Record<string, string> = {
  FOR_DELIVERY: 'Para envio',
  FOR_PICKUP: 'Para retirada',
  AWAITING_CONFIRMATION: 'Aguardando confirmacao',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

const statusClass: Record<string, string> = {
  FOR_DELIVERY: 'bg-blue-100 text-blue-700',
  FOR_PICKUP: 'bg-yellow-100 text-yellow-700',
  AWAITING_CONFIRMATION: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-verde/10 text-verde',
  CANCELLED: 'bg-red-100 text-red-500',
}

export function MyStay() {
  const myStaysKey = ['my-stays']

  const { data: stays = [], isLoading } = useQuery({
    queryKey: myStaysKey,
    queryFn: () => customInstance<Stay[]>({ url: '/stays/my', method: 'GET' }),
  })

  const activeStay = stays.find((s) => s.status === 'ACTIVE')
  const { data: rooms = [] } = useFindAll1()

  const bookingId = activeStay ? getId(activeStay.bookingId) : ''
  const { data: booking } = useFindById6(bookingId, { query: { enabled: !!bookingId } })

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Carregando...</div>
  }

  if (!activeStay) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Minha estadia</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Acompanhe sua estadia atual</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-zinc-100">
          <BedDouble size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhuma estadia ativa no momento</p>
        </div>
      </div>
    )
  }

  const consumptions = activeStay.consumptions ?? []
  const deliveredTotal = consumptions
    .filter((c) => c.deliveryStatus === 'DELIVERED')
    .reduce((acc, c) => acc + (c.unitPrice ?? 0) * (c.quantity ?? 0), 0)

  const pendingCount = consumptions.filter(
    (c) => c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED'
  ).length

  const roomNumbers = booking?.rooms
    ?.map((br) => {
      const room = rooms.find((r: any) => getId(r) === getId(br.roomId))
      return room?.number
    })
    .filter(Boolean)
    .join(', ') ?? '—'

  const checkInDate = activeStay.checkInAt
    ? new Date(activeStay.checkInAt).toLocaleDateString('pt-BR')
    : '—'

  const msSinceCheckIn = activeStay.checkInAt
    ? Date.now() - new Date(activeStay.checkInAt).getTime()
    : 0
  const daysSinceCheckIn = Math.max(0, Math.floor(msSinceCheckIn / (1000 * 60 * 60 * 24)))
  const billingNights = Math.max(1, daysSinceCheckIn)

  const sumDailyRates = booking?.rooms?.reduce((s, r) => s + (r.dailyRate ?? 0), 0) ?? 0
  const totalDailies = billingNights * sumDailyRates
  const advancePayment = booking?.advancePayment ?? 0
  const estimatedTotal = Math.max(0, totalDailies - advancePayment) + deliveredTotal

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Minha estadia</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Acompanhe sua estadia atual</p>
        </div>
        <span className="text-xs bg-verde/10 text-verde font-medium px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-verde animate-pulse" />
          Ativa
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-zinc-100 px-4 py-3.5 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <CalendarDays size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Check-in</p>
            <p className="text-sm font-semibold text-zinc-800">{checkInDate}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-100 px-4 py-3.5 flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <DoorOpen size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Quarto(s)</p>
            <p className="text-sm font-semibold text-zinc-800">{roomNumbers}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-100 px-4 py-3.5 flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-lg">
            <Clock size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">
              {daysSinceCheckIn === 0 ? 'Check-in hoje' : `Ha ${daysSinceCheckIn} dia(s)`}
            </p>
            <p className="text-sm font-semibold text-zinc-800">
              {billingNights} {billingNights === 1 ? 'noite' : 'noites'}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-zinc-100 px-4 py-3.5 flex items-center gap-3">
          <div className="p-2 bg-verde/10 rounded-lg">
            <ShoppingBasket size={18} className="text-verde" />
          </div>
          <div>
            <p className="text-xs text-zinc-400">Consumos</p>
            <p className="text-sm font-semibold text-zinc-800">
              {consumptions.length} {consumptions.length === 1 ? 'item' : 'itens'}
            </p>
            <p className="text-xs text-verde font-medium">
              R$ {deliveredTotal.toFixed(2)} em entregues
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
          <div className="flex items-center gap-2">
            <ShoppingBasket size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Consumos da estadia</h2>
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                {pendingCount} pendente(s)
              </span>
            )}
          </div>
        </div>

        {consumptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1">
            <ShoppingBasket size={24} className="text-zinc-200" />
            <p className="text-zinc-400 text-sm">Nenhum consumo registrado</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {consumptions.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm text-zinc-800 truncate ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : ''}`}>
                      {c.productName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-zinc-400">x{c.quantity}</span>
                      <span className={`text-xs ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-500'}`}>
                        R$ {((c.unitPrice ?? 0) * (c.quantity ?? 0)).toFixed(2)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass[c.deliveryStatus ?? ''] ?? ''}`}>
                        {statusLabel[c.deliveryStatus ?? ''] ?? c.deliveryStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-50">
          <Receipt size={16} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">Resumo financeiro</h2>
        </div>
        <div className="px-5 py-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Diarias ({billingNights} {billingNights === 1 ? 'noite' : 'noites'} x R$ {sumDailyRates.toFixed(2)})</span>
              <span className="text-zinc-800">R$ {totalDailies.toFixed(2)}</span>
            </div>
            {advancePayment > 0 && (
              <div className="flex justify-between text-zinc-500">
                <span>Adiantamento</span>
                <span className="text-red-500">-R$ {advancePayment.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-500">
              <span>Consumos entregues</span>
              <span className="text-zinc-800">R$ {deliveredTotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-zinc-100 pt-2 mt-1 flex justify-between font-semibold text-zinc-800">
              <span>Total estimado</span>
              <span className="text-lg">R$ {estimatedTotal.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            * Valores estimados. O total final sera calculado no momento do check-out.
          </p>
        </div>
      </div>
    </div>
  )
}
