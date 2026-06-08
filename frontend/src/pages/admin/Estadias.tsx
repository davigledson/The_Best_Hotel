import { useState, useMemo, useCallback } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, X, Coffee, ShoppingBasket, ChevronDown, Check, XCircle,
  ChevronLeft, ChevronRight, BedDouble, Users, CalendarDays, LogOut, ArrowLeft,
} from 'lucide-react'
import {
  useFindAll6,
  useCheckIn,
  getFindAll6QueryKey,
} from '../../services/stay-controller/stay-controller'
import { useFindAll2 } from '../../services/product-controller/product-controller'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { useFindAll5 } from '../../services/booking-controller/booking-controller'
import { useFindAll4 } from '../../services/client-controller/client-controller'
import { customInstance } from '../../lib/axios'
import type { Stay, DeliveryStatus } from '../../services/openAPIDefinition.schemas'
import { FilterButton, FilterPanel } from '../../components/FilterPanel'


const PAGE_SIZE = 20

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

const emptyForm = { bookingId: '' as any, status: 'ACTIVE' as const }

interface ModalProps { open: boolean; title: string; onClose: () => void; children: React.ReactNode }
function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-zinc-800">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

interface FormProps { initial: Stay; onSubmit: (data: any) => void; loading: boolean; submitLabel: string }
function CheckInForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [bookingId, setBookingId] = useState((initial.bookingId as string) ?? '')
  const handle = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ bookingId }) }
  return (
    <form onSubmit={handle} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs">Booking ID</label>
        <input value={bookingId} onChange={(e) => setBookingId(e.target.value)} required className="border px-3 py-2 rounded-lg" />
      </div>
      <button type="submit" disabled={loading} className="mt-2 bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg">{submitLabel}</button>
    </form>
  )
}

function getId(obj: any): string {
  const id = obj?.id as any
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return id.toString()
}

function formatDate(date?: string) {
  if (!date) return '—'
  try { return new Date(date).toLocaleDateString('pt-BR') }
  catch { return date }
}

function diffDaysFromNow(date?: string) {
  if (!date) return 0
  return Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 86400000))
}

export function Estadias() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [consumptionMode, setConsumptionMode] = useState<'list' | 'add'>('list')
  const [consumptionForm, setConsumptionForm] = useState({ productId: '', quantity: '1', deliveryStatus: 'FOR_DELIVERY' as DeliveryStatus, notes: '' })
  const [modalCheckIn, setModalCheckIn] = useState(false)
  const [confirmConsumption, setConfirmConsumption] = useState<{ consumptionId: string; deliveryStatus: 'DELIVERED' | 'CANCELLED' } | null>(null)

  const { data: stays = [], isLoading } = useFindAll6()
  const { data: bookings = [] } = useFindAll5()
  const { data: rooms = [] } = useFindAll1()
  const { data: clients = [] } = useFindAll4()
  const { data: products = [] } = useFindAll2()
  const activeProducts = products.filter((p) => p.active)

  const roomsById = useMemo(() => new Map(rooms.map((r) => [getId(r), r])), [rooms])
  const clientsById = useMemo(() => new Map(clients.map((c) => [getId(c), c])), [clients])
  const bookingsById = useMemo(() => new Map(bookings.map((b) => [getId(b), b])), [bookings])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll6QueryKey() })
  const checkInMutation = useCheckIn({ mutation: { onSuccess: () => { invalidate(); setModalCheckIn(false) } } })
  const consumptionMutation = useMutation({
    mutationFn: (params: { stayId: string; data: Record<string, string> }) =>
      customInstance<Stay>({ url: `/stays/${params.stayId}/consumptions`, method: 'POST', data: params.data }),
    onSuccess: () => { invalidate(); setConsumptionMode('list'); setConsumptionForm({ productId: '', quantity: '1', deliveryStatus: 'FOR_DELIVERY', notes: '' }) },
  })
  const statusMutation = useMutation({
    mutationFn: (params: { stayId: string; consumptionId: string; deliveryStatus: DeliveryStatus }) =>
      customInstance<Stay>({ url: `/stays/${params.stayId}/consumptions/${params.consumptionId}`, method: 'PUT', data: { deliveryStatus: params.deliveryStatus } }),
    onSuccess: () => { invalidate(); setConfirmConsumption(null) },
  })

  const getFirstRoomByBooking = useCallback((bookingId: any) => {
    const id = typeof bookingId === 'object' && bookingId?.$oid ? bookingId.$oid : bookingId
    const booking = bookingsById.get(String(id))
    if (!booking?.rooms) return null
    const br = booking.rooms[0]
    const roomId = typeof br.roomId === 'object' && (br.roomId as any)?.$oid ? (br.roomId as any).$oid : br.roomId
    return roomsById.get(String(roomId)) ?? null
  }, [bookingsById, roomsById])

  const getClient = useCallback((clientId: any) => {
    const id = typeof clientId === 'object' && clientId?.$oid ? clientId.$oid : clientId
    return clientsById.get(String(id))
  }, [clientsById])

  const filtered = stays.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false
    if (filters.clientName) {
      const client = getClient(s.clientId)
      if (!(client?.name ?? '').toLowerCase().includes(filters.clientName.toLowerCase())) return false
    }
    if (filters.roomNumber) {
      const room = getFirstRoomByBooking(s.bookingId)
      if (!(room?.number ?? '').toLowerCase().includes(filters.roomNumber.toLowerCase())) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const selectedStay = stays.find((s) => getId(s) === selectedId)

  const totalAtivas = stays.filter((s) => s.status === 'ACTIVE').length
  const totalFinalizadas = stays.filter((s) => s.status === 'CLOSED').length

  const deliveredTotal = useMemo(() => {
    if (!selectedStay?.consumptions) return 0
    return selectedStay.consumptions
      .filter((c) => c.deliveryStatus === 'DELIVERED')
      .reduce((acc, c) => acc + (c.unitPrice ?? 0) * (c.quantity ?? 0), 0)
  }, [selectedStay])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Estadias</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie estadias, consumos e check-outs</p>
        </div>
        {!selectedId && (
          <button onClick={() => setModalCheckIn(true)}
            className="flex items-center gap-2 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg">
            <Plus size={16} /> Check-in
          </button>
        )}
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => { setStatusFilter(''); setPage(0) }}
          className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${statusFilter === '' ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full w-fit bg-zinc-100 text-zinc-600">Todas</span>
          <span className="text-2xl font-semibold text-zinc-800">{stays.length}</span>
        </button>
        <button onClick={() => { setStatusFilter('ACTIVE'); setPage(0) }}
          className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${statusFilter === 'ACTIVE' ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full w-fit bg-verde/10 text-verde">Ativas</span>
          <span className="text-2xl font-semibold text-zinc-800">{totalAtivas}</span>
        </button>
        <button onClick={() => { setStatusFilter('CLOSED'); setPage(0) }}
          className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${statusFilter === 'CLOSED' ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full w-fit bg-zinc-100 text-zinc-500">Finalizadas</span>
          <span className="text-2xl font-semibold text-zinc-800">{totalFinalizadas}</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <FilterButton
          activeCount={Object.values(filters).filter(Boolean).length}
          onClick={() => setFilterOpen(!filterOpen)}
        />
      </div>

      {selectedId ? (
        /* ── Detalhamento da estadia ── */
        <div className="flex flex-col gap-5">
          <button onClick={() => { setSelectedId(null); setConsumptionMode('list') }}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors w-fit">
            <ArrowLeft size={16} /> Voltar para lista
          </button>

          {selectedStay && (() => {
            const room = getFirstRoomByBooking(selectedStay.bookingId)
            const client = getClient(selectedStay.clientId)
            const days = diffDaysFromNow(selectedStay.checkInAt)
            const consumptions = selectedStay.consumptions ?? []
            const pendentes = consumptions.filter((c) => c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED')

            return (
              <>
                {/* Info stay */}
                <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                    <BedDouble size={22} className="text-zinc-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-800">Quarto {room?.number ?? '—'} — {room?.type || '—'}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selectedStay.status === 'ACTIVE' ? 'bg-verde/10 text-verde' : 'bg-zinc-100 text-zinc-500'}`}>
                        {selectedStay.status === 'ACTIVE' ? 'Ativa' : 'Finalizada'}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-500 mt-0.5">{client?.name ?? '—'}</p>
                  </div>
                  <div className="text-sm text-zinc-500 text-right shrink-0">
                    <p>Check-in: {formatDate(selectedStay.checkInAt)}</p>
                    <p className="text-xs text-zinc-400">{days} dia(s)</p>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-700 font-medium">
                    <LogOut size={16} />
                    Total de diarias
                  </div>
                  <span className="text-xl font-bold text-amber-700">
                    R$ {selectedStay.totalDailies?.toFixed(2) ?? '0.00'}
                  </span>
                </div>

                {/* Consumos */}
                <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <ShoppingBasket size={15} className="text-amber-400" />
                      Consumos {consumptions.length > 0 && `(${consumptions.length})`}
                    </div>
                    {selectedStay.status === 'ACTIVE' && (
                      <button onClick={() => setConsumptionMode(consumptionMode === 'list' ? 'add' : 'list')}
                        className="flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                        {consumptionMode === 'list' ? <Plus size={13} /> : <ArrowLeft size={13} />}
                        {consumptionMode === 'list' ? 'Novo consumo' : 'Voltar'}
                      </button>
                    )}
                  </div>

                  <div className="px-5 py-4">
                    {consumptionMode === 'list' ? (
                      consumptions.length === 0 ? (
                        <p className="text-sm text-zinc-400 text-center py-4">Nenhum consumo registrado ainda</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {consumptions.map((c, i) => (
                            <div key={c.id ?? i} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-800'}`}>{c.productName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-xs ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-400'}`}>x{c.quantity} — R$ {((c.unitPrice ?? 0) * (c.quantity ?? 0)).toFixed(2)}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass[c.deliveryStatus ?? ''] ?? ''}`}>{statusLabel[c.deliveryStatus ?? ''] ?? c.deliveryStatus}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-3">
                                {selectedStay.status === 'ACTIVE' && c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED' && (
                                  <>
                                    {(c.deliveryStatus === 'FOR_DELIVERY' || c.deliveryStatus === 'FOR_PICKUP') && (
                                      <button onClick={() => setConfirmConsumption({ consumptionId: c.id ?? '', deliveryStatus: 'DELIVERED' })}
                                        disabled={statusMutation.isPending}
                                        className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors">
                                        <Check size={12} />Entregue
                                      </button>
                                    )}
                                    <button onClick={() => setConfirmConsumption({ consumptionId: c.id ?? '', deliveryStatus: 'CANCELLED' })}
                                      disabled={statusMutation.isPending}
                                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                                      <XCircle size={12} />Cancelar
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                          {deliveredTotal > 0 && (
                            <div className="flex justify-between text-sm pt-2 border-t border-zinc-100 mt-2">
                              <span className="text-zinc-500">Total consumos (entregues)</span>
                              <span className="font-medium text-zinc-800">R$ {deliveredTotal.toFixed(2)}</span>
                            </div>
                          )}
                          {pendentes.length > 0 && selectedStay.status !== 'CLOSED' && (
                            <p className="text-xs text-zinc-400 mt-1">{pendentes.length} consumo(s) pendente(s)</p>
                          )}
                        </div>
                      )
                    ) : (
                      /* Formulario criar consumo */
                      <form onSubmit={(e) => { e.preventDefault(); if (!consumptionForm.productId) return; consumptionMutation.mutate({ stayId: getId(selectedStay), data: consumptionForm }) }} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Produto</label>
                          <div className="relative">
                            <select value={consumptionForm.productId} onChange={(e) => setConsumptionForm({ ...consumptionForm, productId: e.target.value })} required className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none">
                              <option value="">Selecione</option>
                              {activeProducts.map((p) => (<option key={(p.id as any)?.$oid ?? p.id} value={(p.id as any)?.$oid ?? p.id}>{p.name} — R$ {p.price?.toFixed(2)}</option>))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Quantidade</label>
                          <input type="number" min={1} value={consumptionForm.quantity} onChange={(e) => setConsumptionForm({ ...consumptionForm, quantity: e.target.value })} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tipo de entrega</label>
                          <div className="relative">
                            <select value={consumptionForm.deliveryStatus} onChange={(e) => setConsumptionForm({ ...consumptionForm, deliveryStatus: e.target.value as DeliveryStatus })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none">
                              <option value="FOR_DELIVERY">Para envio</option>
                              <option value="FOR_PICKUP">Para retirada</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Observacao</label>
                          <input type="text" value={consumptionForm.notes} onChange={(e) => setConsumptionForm({ ...consumptionForm, notes: e.target.value })} placeholder="Opcional" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde placeholder:text-zinc-300" />
                        </div>
                        {consumptionMutation.isError && (<div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-center">Erro ao registrar consumo</div>)}
                        <button type="submit" disabled={consumptionMutation.isPending}
                          className="bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors">
                          {consumptionMutation.isPending ? 'Registrando...' : 'Registrar consumo'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Check-out */}
                {selectedStay.status === 'ACTIVE' && (
                  <div className="flex justify-end">
                    <button onClick={() => {
                      const prefix = location.pathname.startsWith('/employee') ? '/employee' : '/admin'
                      navigate(`${prefix}/checkout?stayId=${getId(selectedStay)}`)
                    }}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-900 rounded-lg transition-colors">
                      <LogOut size={15} />
                      Realizar Check-out
                    </button>
                  </div>
                )}
              </>
            )
          })()}
        </div>
      ) : (
        <div className="flex gap-6">
          <FilterPanel
            open={filterOpen}
            config={[
              { key: 'clientName', label: 'Nome do hóspede', type: 'text' },
              { key: 'roomNumber', label: 'Número do quarto', type: 'text' },
            ]}
            filters={filters}
            onChange={(f) => { setFilters(f); setPage(0) }}
          />
          <div className="flex-1 min-w-0">
            {/* ── Grid de cards ── */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
            ) : paginated.length === 0 ? (
              <div className="bg-white rounded-xl border border-zinc-100 p-16 flex flex-col items-center gap-3 text-center">
                <Coffee size={36} className="text-zinc-200" />
                <p className="text-zinc-400 text-sm">Nenhuma estadia encontrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map((s) => {
                const room = getFirstRoomByBooking(s.bookingId)
                const client = getClient(s.clientId)
                const days = diffDaysFromNow(s.checkInAt)
                const totalCons = s.consumptions?.length ?? 0
                const pendentes = s.consumptions?.filter((c) => c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED').length ?? 0
                const deliveredCons = s.consumptions?.filter((c) => c.deliveryStatus === 'DELIVERED').length ?? 0
                const deliveredValue = s.consumptions?.filter((c) => c.deliveryStatus === 'DELIVERED').reduce((acc, c) => acc + (c.unitPrice ?? 0) * (c.quantity ?? 0), 0) ?? 0

                const roomLabel = room?.number ? `Quarto ${room.number}` : 'Sem quarto'
                const typeLabel = room?.type ?? 'Tipo não definido'
                const clientLabel = client?.name ?? 'Hóspede não identificado'
                const dateLabel = s.checkInAt ? formatDate(s.checkInAt) : 'Pendente'

                const hasPendentes = pendentes > 0 && s.status === 'ACTIVE'
                const allDone = totalCons > 0 && deliveredCons === totalCons

                return (
                  <button key={getId(s)} onClick={() => { setSelectedId(getId(s)); setConsumptionMode('list') }}
                    className={`bg-white rounded-xl border p-4 flex flex-col gap-3 text-left transition-all hover:border-amber-300 hover:shadow-sm ${selectedId === getId(s) ? 'border-amber-400 ring-1 ring-amber-400' : 'border-zinc-100'}`}>

                    {/* Topo: Room + Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                          <BedDouble size={18} className="text-zinc-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-800 truncate">{roomLabel}</p>
                          <p className="text-xs text-zinc-400 truncate">{typeLabel}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${s.status === 'ACTIVE' ? 'bg-verde/10 text-verde' : 'bg-zinc-100 text-zinc-500'}`}>
                        {s.status === 'ACTIVE' ? 'Ativa' : 'Finalizada'}
                      </span>
                    </div>

                    {/* Cliente */}
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Users size={13} className="text-zinc-300 shrink-0" />
                      <span className="truncate">{clientLabel}</span>
                    </div>

                    {/* Info grid */}
                    <div className="border-t border-zinc-50 pt-3 grid grid-cols-2 gap-x-2 gap-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <CalendarDays size={13} className="text-zinc-300 shrink-0" />
                        <span>{dateLabel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <CalendarDays size={13} className="text-zinc-300 shrink-0" />
                        <span>{days} dia(s)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500">
                        <ShoppingBasket size={13} className="text-zinc-300 shrink-0" />
                        <span>{deliveredValue > 0 ? `R$ ${deliveredValue.toFixed(2)}` : `${totalCons} consumo(s)`}</span>
                      </div>
                      {hasPendentes ? (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <ShoppingBasket size={13} className="text-amber-300 shrink-0" />
                          <span className="font-medium">{pendentes} pendente(s)</span>
                        </div>
                      ) : allDone && (
                        <div className="flex items-center gap-1.5 text-verde">
                          <Check size={13} className="shrink-0" />
                          <span className="font-medium">Finalizado</span>
                        </div>
                      )}
                    </div>

                    {/* Barra de progresso consumos (só se ACTIVE e tem consumos) */}
                    {s.status === 'ACTIVE' && totalCons > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full bg-verde rounded-full transition-all" style={{ width: `${(deliveredCons / totalCons) * 100}%` }} />
                        </div>
                        <span className="text-[11px] text-zinc-400 shrink-0">{deliveredCons}/{totalCons}</span>
                      </div>
                    )}

                    {/* Ação */}
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                      Ver detalhes
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Paginacao */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-zinc-500 px-3">
                {page + 1} de {totalPages}
              </span>
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modal Check-in */}
      <Modal open={modalCheckIn} title="Check-in" onClose={() => setModalCheckIn(false)}>
        <CheckInForm initial={emptyForm} submitLabel="Registrar check-in" loading={checkInMutation.isPending} onSubmit={(data) => checkInMutation.mutate({ data })} />
      </Modal>

      {/* Modal confirmar consumo */}
      <Modal open={!!confirmConsumption} title={confirmConsumption?.deliveryStatus === 'DELIVERED' ? 'Confirmar entrega' : 'Cancelar consumo'} onClose={() => setConfirmConsumption(null)}>
        {confirmConsumption && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              {confirmConsumption.deliveryStatus === 'DELIVERED'
                ? 'Confirmar que este consumo foi entregue ao hospede?'
                : 'Tem certeza que deseja cancelar este consumo?'}
            </p>
            {statusMutation.isError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">Erro ao atualizar consumo.</div>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setConfirmConsumption(null)} disabled={statusMutation.isPending}
                className="px-4 py-2 text-sm text-zinc-600 border rounded-lg">Voltar</button>
              <button onClick={() => statusMutation.mutate({ stayId: getId(selectedStay!), consumptionId: confirmConsumption.consumptionId, deliveryStatus: confirmConsumption.deliveryStatus })} disabled={statusMutation.isPending}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${confirmConsumption.deliveryStatus === 'DELIVERED' ? 'bg-green-600' : 'bg-red-500'}`}>
                {statusMutation.isPending ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  )
}
