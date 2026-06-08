import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, BedDouble, Users, CalendarCheck, ShoppingBasket, DollarSign, ChevronLeft, ChevronRight, X, Check, UserCheck } from 'lucide-react'
import { useFindAll5 } from '../../services/booking-controller/booking-controller'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { useFindAll3 } from '../../services/employee-controller/employee-controller'
import { useFindAll4 } from '../../services/client-controller/client-controller'
import { useCheckOut, useFindAll6, getFindAll6QueryKey } from '../../services/stay-controller/stay-controller'
import { getFindAll5QueryKey } from '../../services/booking-controller/booking-controller'
import { useAuth } from '../../contexts/AuthContext'
import { FilterButton, FilterPanel } from '../../components/FilterPanel'


const PAGE_SIZE = 20

const statusLabel: Record<string, string> = { FOR_DELIVERY: 'Para envio', FOR_PICKUP: 'Para retirada', AWAITING_CONFIRMATION: 'Aguardando confirmacao', DELIVERED: 'Entregue', CANCELLED: 'Cancelado' }
const statusClass: Record<string, string> = { FOR_DELIVERY: 'bg-blue-100 text-blue-700', FOR_PICKUP: 'bg-yellow-100 text-yellow-700', AWAITING_CONFIRMATION: 'bg-purple-100 text-purple-700', DELIVERED: 'bg-verde/10 text-verde', CANCELLED: 'bg-red-100 text-red-500' }

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

const inputClass = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent bg-white"
const labelClass = "text-xs font-medium text-zinc-500 uppercase tracking-wide"

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-zinc-800">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export function CheckOut() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: stays = [] } = useFindAll6()
  const { data: bookings = [] } = useFindAll5()
  const { data: rooms = [] } = useFindAll1()
  const { data: employees = [] } = useFindAll3()
  const { data: clients = [] } = useFindAll4()

  const isAdmin = user?.role === 'ADMIN'
  const activeStays = stays.filter((s) => s.status === 'ACTIVE')

  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    const stayId = searchParams.get('stayId')
    if (stayId && activeStays.length > 0) {
      const found = activeStays.find((s) => getId(s) === stayId)
      if (found) {
        setSelectedId(stayId)
        setSuccess(false)
        setShowConfirm(false)
      }
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, activeStays])

  const roomsById = useMemo(() => new Map(rooms.map((r) => [getId(r), r])), [rooms])
  const clientsById = useMemo(() => new Map(clients.map((c) => [getId(c), c])), [clients])
  const bookingsById = useMemo(() => new Map(bookings.map((b) => [getId(b), b])), [bookings])

  const getClient = useCallback((clientId: any) => {
    const id = typeof clientId === 'object' && clientId?.$oid ? clientId.$oid : clientId
    return clientsById.get(String(id))
  }, [clientsById])

  const getRoomsByBooking = useCallback((bookingId: any) => {
    const id = typeof bookingId === 'object' && bookingId?.$oid ? bookingId.$oid : bookingId
    const booking = bookingsById.get(String(id))
    if (!booking?.rooms) return []
    return booking.rooms.map((br) => {
      const roomId = typeof br.roomId === 'object' && (br.roomId as any)?.$oid ? (br.roomId as any).$oid : br.roomId
      return roomsById.get(String(roomId))
    }).filter(Boolean)
  }, [bookingsById, roomsById])

  const getFirstRoomByBooking = useCallback((bookingId: any) => {
    const rooms = getRoomsByBooking(bookingId)
    return rooms[0] ?? null
  }, [getRoomsByBooking])

  const filtered = activeStays.filter((s) => {
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

  const selectedStay = activeStays.find((s) => getId(s) === selectedId)

  const checkOutMutation = useCheckOut({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getFindAll6QueryKey() })
        queryClient.invalidateQueries({ queryKey: getFindAll5QueryKey() })
        setSuccess(true)
        setShowConfirm(false)
        setSelectedId(null)
        setEmployeeId('')
      },
    },
  })

  const deliveredTotal = useMemo(() => {
    if (!selectedStay?.consumptions) return 0
    return selectedStay.consumptions
      .filter((c) => c.deliveryStatus === 'DELIVERED')
      .reduce((acc, c) => acc + (c.unitPrice ?? 0) * (c.quantity ?? 0), 0)
  }, [selectedStay])

  const pendingCount = useMemo(() => {
    if (!selectedStay?.consumptions) return 0
    return selectedStay.consumptions.filter((c) => c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED').length
  }, [selectedStay])

  const handleConfirm = () => {
    setSuccess(false)
    const body: Record<string, string> = {}
    if (isAdmin) body.employeeId = employeeId
    checkOutMutation.mutate({ id: selectedId!, data: body as any })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">Check-out</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Registre a saida de hospedes e finalize a estadia</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          Check-out realizado com sucesso!
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <FilterButton
          activeCount={Object.values(filters).filter(Boolean).length}
          onClick={() => setFilterOpen(!filterOpen)}
        />
      </div>

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
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-100 p-16 flex flex-col items-center justify-center gap-3 text-center">
              <LogOut size={36} className="text-zinc-200" />
              <p className="text-zinc-400 text-sm">Nenhuma estadia ativa no momento</p>
            </div>
          ) : (
            <>
              {/* Grid de cards */}
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
              const clientLabel = client?.name ?? 'Hóspede não identificado'
              const dateLabel = s.checkInAt ? `Check-in: ${formatDate(s.checkInAt)}` : 'Check-in pendente'

              return (
                <button key={getId(s)} onClick={() => { setSelectedId(getId(s)); setShowConfirm(false); setEmployeeId('') }}
                  className={`bg-white rounded-xl border p-4 flex flex-col gap-3 text-left transition-all hover:border-amber-300 hover:shadow-sm ${selectedId === getId(s) ? 'border-amber-400 ring-1 ring-amber-400' : 'border-zinc-100'}`}>

                  {/* Topo */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                        <BedDouble size={18} className="text-zinc-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-800 truncate">{roomLabel}</p>
                        <p className="text-xs text-zinc-400 truncate">{room?.type ?? 'Tipo não definido'}</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                      Ativo
                    </span>
                  </div>

                  {/* Cliente */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users size={13} className="text-zinc-300 shrink-0" />
                    <span className="truncate">{clientLabel}</span>
                  </div>

                  {/* Info */}
                  <div className="border-t border-zinc-50 pt-3 grid grid-cols-2 gap-x-2 gap-y-2.5 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <CalendarCheck size={13} className="text-zinc-300 shrink-0" />
                      <span>{dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <CalendarCheck size={13} className="text-zinc-300 shrink-0" />
                      <span>{days} dia(s)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <ShoppingBasket size={13} className="text-zinc-300 shrink-0" />
                      <span>{deliveredValue > 0 ? `R$ ${deliveredValue.toFixed(2)}` : `${totalCons} consumo(s)`}</span>
                    </div>
                    {pendentes > 0 ? (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <ShoppingBasket size={13} className="text-amber-300 shrink-0" />
                        <span className="font-medium">{pendentes} pendente(s)</span>
                      </div>
                    ) : totalCons > 0 && (
                      <div className="flex items-center gap-1.5 text-verde">
                        <Check size={13} className="shrink-0" />
                        <span className="font-medium">Finalizado</span>
                      </div>
                    )}
                  </div>

                  {/* Barra de progresso */}
                  {totalCons > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-verde rounded-full transition-all" style={{ width: `${(deliveredCons / totalCons) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-zinc-400 shrink-0">{deliveredCons}/{totalCons}</span>
                    </div>
                  )}

                  {/* Ação */}
                  <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
                    <LogOut size={13} /> Selecionar
                  </div>
                </button>
              )
            })}
          </div>

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
        </>
      )}

      </div>
      </div>

      {/* Modal de detalhamento */}
      <Modal open={!!selectedStay && !showConfirm} title="Detalhes do Check-out" onClose={() => { setSelectedId(null); setSuccess(false) }}>
        {selectedStay && (() => {
          const room = getFirstRoomByBooking(selectedStay.bookingId)
          const client = getClient(selectedStay.clientId)
          const days = diffDaysFromNow(selectedStay.checkInAt)
          const consumptions = selectedStay.consumptions ?? []

          return (
            <div className="flex flex-col gap-5">

              {/* Info stay */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex items-center gap-3">
                <BedDouble size={20} className="text-zinc-500 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-800">{room?.number ? `Quarto ${room.number}` : 'Sem quarto'} — {room?.type ?? 'Tipo não definido'}</p>
                  <p className="text-xs text-zinc-500">
                    Check-in: {formatDate(selectedStay.checkInAt)} · {days} dia(s)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Cliente</span>
                  <span className="text-sm font-semibold text-zinc-800">{client?.name ?? 'Hóspede não identificado'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Total diarias</span>
                  <span className="text-sm font-semibold text-zinc-800">R$ {selectedStay.totalDailies?.toFixed(2) ?? '0.00'}</span>
                </div>
              </div>

              {/* Consumos */}
              {consumptions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                    <ShoppingBasket size={14} className="text-amber-400" />
                    Consumos
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {consumptions.map((c, i) => (
                      <div key={c.id ?? i} className="flex items-center justify-between text-sm">
                        <div className="flex flex-col min-w-0">
                          <span className={`truncate ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-700'}`}>
                            {c.productName}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-400'}`}>
                              x{c.quantity} — R$ {c.unitPrice?.toFixed(2)} un.
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass[c.deliveryStatus ?? ''] ?? ''}`}>
                              {statusLabel[c.deliveryStatus ?? ''] ?? c.deliveryStatus}
                            </span>
                          </div>
                        </div>
                        <span className={`font-medium shrink-0 ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-800'}`}>
                          R$ {((c.quantity ?? 0) * (c.unitPrice ?? 0)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-zinc-50 pt-2 flex justify-between text-sm">
                    <span className="text-zinc-500">Total consumos (entregues)</span>
                    <span className="font-medium text-zinc-800">R$ {deliveredTotal.toFixed(2)}</span>
                  </div>
                  {pendingCount > 0 && (
                    <p className="text-xs text-zinc-400">{pendingCount} consumo(s) pendente(s) serao desconsiderados no check-out.</p>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 font-medium">
                  <DollarSign size={16} />
                  Total a pagar
                </div>
                <span className="text-xl font-bold text-amber-700">
                  R$ {((selectedStay.totalDailies ?? 0) + deliveredTotal).toFixed(2)}
                </span>
              </div>

              {/* Responsavel */}
              {isAdmin ? (
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Funcionario responsavel</label>
                  <div className="relative">
                    <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                      required className={`${inputClass} appearance-none`}>
                      <option value="">Selecione um funcionario</option>
                      {employees.map((emp) => (
                        <option key={getId(emp)} value={getId(emp)}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-50 rounded-lg px-4 py-3">
                  <UserCheck size={16} className="text-zinc-400" />
                  Responsavel: <span className="font-medium text-zinc-700">{user?.email}</span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setSelectedId(null)}
                  className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                  Voltar
                </button>
                <button onClick={() => setShowConfirm(true)} disabled={isAdmin && !employeeId}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 rounded-lg transition-colors">
                  <LogOut size={15} />
                  Realizar Check-out
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal de confirmacao */}
      <Modal open={showConfirm} title="Confirmar Check-out" onClose={() => !checkOutMutation.isPending && setShowConfirm(false)}>
        {selectedStay && (() => {
          const room = getFirstRoomByBooking(selectedStay.bookingId)

          return (
            <div className="flex flex-col gap-5">
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 flex items-center gap-3">
                <BedDouble size={20} className="text-zinc-500 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-800">Check-out — {room?.number ? `Quarto ${room.number}` : 'Sem quarto'}</p>
                  <p className="text-xs text-zinc-500">Entrada em {formatDate(selectedStay.checkInAt)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Total de diarias</span>
                  <span className="font-semibold text-zinc-800">R$ {selectedStay.totalDailies?.toFixed(2) ?? '0.00'}</span>
                </div>

                {selectedStay.consumptions && selectedStay.consumptions.length > 0 && (
                  <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                      <ShoppingBasket size={14} className="text-amber-400" />
                      Consumos
                    </div>
                    {selectedStay.consumptions.map((c, i) => (
                      <div key={c.id ?? i} className="flex justify-between text-sm ml-5">
                        <span className={`${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-600'}`}>
                          {c.productName} <span className="text-zinc-400">x{c.quantity}</span>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass[c.deliveryStatus ?? ''] ?? ''}`}>
                            {statusLabel[c.deliveryStatus ?? ''] ?? c.deliveryStatus}
                          </span>
                        </span>
                        <span className={`${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-700'}`}>
                          R$ {((c.quantity ?? 0) * (c.unitPrice ?? 0)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm ml-5 border-t border-zinc-50 pt-1">
                      <span className="text-zinc-500">Subtotal consumos (entregues)</span>
                      <span className="font-medium text-zinc-800">R$ {deliveredTotal.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-zinc-100 pt-3">
                  <span className="text-sm font-medium text-zinc-700">Total geral</span>
                  <span className="text-lg font-bold text-amber-600">
                    R$ {((selectedStay.totalDailies ?? 0) + deliveredTotal).toFixed(2)}
                  </span>
                </div>
              </div>

              {checkOutMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                  Erro ao realizar check-out. Verifique os dados e tente novamente.
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button onClick={() => setShowConfirm(false)} disabled={checkOutMutation.isPending}
                  className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                  Voltar
                </button>
                <button onClick={handleConfirm} disabled={checkOutMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 rounded-lg transition-colors">
                  <Check size={15} />
                  {checkOutMutation.isPending ? 'Processando...' : 'Confirmar Check-out'}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
