import { useState, useRef } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Plus, X, CalendarCheck, Hotel, AlertTriangle } from 'lucide-react'
import {
  useCreate5,
  useCancel,
  useFindAll5,
} from '../../services/booking-controller/booking-controller'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { customInstance } from '../../lib/axios'
import type { Booking } from '../../services/openAPIDefinition.schemas'

interface ConflictDetail {
  bookingId: string
  checkInDate: string
  checkOutDate: string
  roomNumbers: string
  status: string
}

interface ConflictData {
  type: 'BLOCKING' | 'PENDING'
  message: string
  conflicts: ConflictDetail[]
}

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmada',
  CHECKIN: 'Em estadia',
  CHECKOUT: 'Finalizada',
  CANCELLED: 'Cancelada',
}

const statusClass: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  CHECKIN: 'bg-verde/10 text-verde',
  CHECKOUT: 'bg-zinc-100 text-zinc-500',
  CANCELLED: 'bg-red-100 text-red-500',
}

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
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

const getId = (obj: any): string => {
  const id = obj?.id as unknown as { $oid?: string } | string
  if (typeof id === 'string') return id
  if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''
  return ''
}

const getRoomId = (roomId: any): string => {
  if (!roomId) return ''
  if (typeof roomId === 'string') return roomId
  if (roomId.$oid) return roomId.$oid
  return String(roomId)
}

export function MyBookings() {
  const queryClient = useQueryClient()
  const [modalCreate, setModalCreate] = useState(false)
  const [modalCancel, setModalCancel] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [createConflictData, setCreateConflictData] = useState<ConflictData | null>(null)
  const lastCreateData = useRef<any>(null)

  const [form, setForm] = useState({
    selectedRooms: [] as { roomId: string; numberOfGuests: number }[],
    checkInDate: '',
    checkOutDate: '',
  })

  const myBookingsKey = ['my-bookings']

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: myBookingsKey,
    queryFn: () => customInstance<Booking[]>({ url: '/bookings/my', method: 'GET' }),
  })
  const { data: rooms = [] } = useFindAll1()
  const { data: allBookings = [] } = useFindAll5()

  const conflictRoomIds = new Set<string>()

  if (form.checkInDate && form.checkOutDate) {
    for (const b of allBookings) {
      if (!b.checkInDate || !b.checkOutDate || b.status === 'CANCELLED' || b.status === 'CHECKOUT' || b.status === 'PENDING') continue
      if (form.checkInDate >= b.checkOutDate || form.checkOutDate <= b.checkInDate) continue
      const roomIds = b.rooms?.map((r) => getRoomId(r.roomId)) ?? []
      roomIds.forEach((id) => conflictRoomIds.add(id))
    }
  }

  const visibleRooms = rooms.filter((r: any) => r.status === 'AVAILABLE' && !conflictRoomIds.has(getRoomId(r.id)))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: myBookingsKey })

  const createMutation = useCreate5({
    mutation: {
      onSuccess: (data) => {
        invalidate()
        setCreateConflictData(null)
        const msg = (data as any)?.warningMessage
        if (msg) {
          setWarningMessage(msg)
        } else {
          setModalCreate(false)
          setForm({ selectedRooms: [] as { roomId: string; numberOfGuests: number }[], checkInDate: '', checkOutDate: '' })
          setSubmitError(null)
        }
      },
      onError: (error) => {
        const data = (error as any)?.response?.data as ConflictData | undefined
        if (data?.type === 'BLOCKING' || data?.type === 'PENDING') {
          setCreateConflictData(data)
        }
      },
    },
  })

  const cancelMutation = useCancel({
    mutation: {
      onSuccess: () => {
        invalidate()
        setModalCancel(null)
        setCancelReason('')
      },
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (form.selectedRooms.length === 0) {
      setSubmitError('Selecione pelo menos um quarto')
      return
    }
    const roomsPayload = form.selectedRooms.map((sr) => {
      const room = rooms.find((r: any) => getId(r) === sr.roomId)
      return { roomId: sr.roomId as any, dailyRate: room?.dailyRate, numberOfGuests: sr.numberOfGuests }
    })
    const advancePayment = roomsPayload.reduce((s: number, r: any) => s + (r.dailyRate ?? 0), 0)
    const bookingData = {
      rooms: roomsPayload as any,
      checkInDate: form.checkInDate as any,
      checkOutDate: form.checkOutDate as any,
      advancePayment,
      guests: [],
    }
    lastCreateData.current = bookingData
    createMutation.mutate({ data: bookingData })
  }

  const createErrData = (createMutation.error as any)?.response?.data as ConflictData | undefined
  const isCreateConflict = createErrData?.type === 'BLOCKING' || createErrData?.type === 'PENDING'
  const mutationError = isCreateConflict
    ? null
    : (createMutation.error as any)?.response?.data?.message ?? (createMutation.error as any)?.message ?? null

  const today = new Date().toISOString().split('T')[0]

  const canCancel = (booking: Booking) =>
    booking.status === 'CONFIRMED' || booking.status === 'PENDING'

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Minhas reservas</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie suas reservas no hotel</p>
        </div>
        <button
          onClick={() => setModalCreate(true)}
          className="flex items-center gap-2 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nova reserva
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-sm text-zinc-400">Carregando...</div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-zinc-100">
          <CalendarCheck size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhuma reserva encontrada</p>
          <button
            onClick={() => setModalCreate(true)}
            className="mt-2 text-sm text-amber-500 hover:text-amber-600 font-medium transition-colors"
          >
            Fazer primeira reserva
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <div
              key={getId(booking)}
              className="bg-white rounded-xl border border-zinc-100 px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-zinc-100 rounded-lg">
                  <Hotel size={18} className="text-zinc-500" />
                </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-800">
                        {booking.rooms?.length ?? 1} quarto(s)
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass[booking.status ?? ''] ?? 'bg-zinc-100 text-zinc-500'}`}>
                        {statusLabel[booking.status ?? ''] ?? booking.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                      <span>Check-in: <span className="text-zinc-600">{String(booking.checkInDate)}</span></span>
                      <span>Check-out: <span className="text-zinc-600">{String(booking.checkOutDate)}</span></span>
                      <span>Adto: <span className="text-zinc-600 font-medium">R$ {booking.advancePayment?.toFixed(2)}</span></span>
                    </div>
                    {booking.status === 'PENDING' && (
                      <p className="text-xs text-yellow-600 mt-1.5">
                        Aguardando aprovacao de um funcionario
                      </p>
                    )}
                  </div>
              </div>

              {canCancel(booking) && (
                <button
                  onClick={() => setModalCancel(booking)}
                  className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nova reserva */}
      <Modal open={modalCreate} title="Nova reserva" onClose={() => { setModalCreate(false); setSubmitError(null); setWarningMessage(null); setCreateConflictData(null) }}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">

          {(submitError || mutationError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {submitError || mutationError}
            </div>
          )}

          {warningMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
              <span className="flex-1">{warningMessage}</span>
              <button type="button" onClick={() => { setWarningMessage(null); setModalCreate(false) }}
                className="text-amber-500 hover:text-amber-700 font-medium text-xs whitespace-nowrap">
                Fechar
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Data de check-in</label>
            <input
              type="date"
              value={form.checkInDate}
              min={today}
              onChange={(e) => { setForm({ ...form, checkInDate: e.target.value, selectedRooms: [] as { roomId: string; numberOfGuests: number }[] }); setSubmitError(null) }}
              required
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Data de check-out</label>
            <input
              type="date"
              value={form.checkOutDate}
              min={form.checkInDate || today}
              onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
              required
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Quartos ({form.selectedRooms.length} selecionado(s))</label>
            <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
              {visibleRooms.map((room: any) => {
                const rid = getId(room)
                const selected = form.selectedRooms.find((sr) => sr.roomId === rid)
                return (
                  <label key={rid} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors ${selected ? 'bg-amber-50' : ''}`}>
                    <input type="checkbox" checked={!!selected}
                      onChange={() => {
                        if (selected) {
                          setForm((prev) => ({ ...prev, selectedRooms: prev.selectedRooms.filter((sr) => sr.roomId !== rid) }))
                        } else {
                          const cap = room.capacity ?? 1
                          setForm((prev) => ({ ...prev, selectedRooms: [...prev.selectedRooms, { roomId: rid, numberOfGuests: Math.min(2, cap) }] }))
                        }
                      }}
                      className="accent-amber-400 w-4 h-4 rounded" />
                    <span className="flex-1 text-sm text-zinc-700">
                      Quarto {room.number} — {room.type} — R$ {room.dailyRate?.toFixed(2)}/dia
                    </span>
                    {selected && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-zinc-400">Hosp:</span>
                        <input type="number" min={1} max={room.capacity} value={selected.numberOfGuests}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1
                            setForm((prev) => ({
                              ...prev,
                              selectedRooms: prev.selectedRooms.map((sr) =>
                                sr.roomId === rid ? { ...sr, numberOfGuests: Math.max(1, val) } : sr
                              ),
                            }))
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-14 text-xs border border-zinc-200 rounded px-1.5 py-1 text-center" />
                      </div>
                    )}
                  </label>
                )
              })}
              {visibleRooms.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">Nenhum quarto disponivel para este período</p>
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-amber-700">Adiantamento (1a diaria de cada quarto)</span>
            <span className="text-base font-bold text-amber-700">
              R$ {form.selectedRooms.reduce((s, sr) => {
                const room = rooms.find((r: any) => getId(r) === sr.roomId)
                return s + (room?.dailyRate ?? 0)
              }, 0).toFixed(2)}
            </span>
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            {createMutation.isPending ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </form>
      </Modal>

      {/* Modal conflito */}
      <Modal open={!!createConflictData} title="Conflitos encontrados" onClose={() => { setCreateConflictData(null); lastCreateData.current = null; createMutation.reset() }}>
        {createConflictData && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">{createConflictData.message}</p>
            <div className="overflow-x-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left px-3 py-2 font-medium text-zinc-500">Quarto(s)</th>
                    <th className="text-left px-3 py-2 font-medium text-zinc-500">Check-in</th>
                    <th className="text-left px-3 py-2 font-medium text-zinc-500">Check-out</th>
                    <th className="text-left px-3 py-2 font-medium text-zinc-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {createConflictData.conflicts.map((c) => (
                    <tr key={c.bookingId} className="border-b border-zinc-50">
                      <td className="px-3 py-2 text-zinc-800">{c.roomNumbers || '—'}</td>
                      <td className="px-3 py-2 text-zinc-600">{String(c.checkInDate)}</td>
                      <td className="px-3 py-2 text-zinc-600">{String(c.checkOutDate)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusClass[c.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {statusLabel[c.status] ?? c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setCreateConflictData(null); lastCreateData.current = null; createMutation.reset() }}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Voltar
              </button>
              {createConflictData.type === 'PENDING' && (
                <button onClick={() => {
                  if (lastCreateData.current) {
                    createMutation.mutate({ data: { ...lastCreateData.current, confirmCancelPending: true } })
                  }
                  setCreateConflictData(null)
                }}
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg transition-colors">
                  {createMutation.isPending ? 'Processando...' : 'Sim, cancelar e prosseguir'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal cancelar */}
      <Modal open={!!modalCancel} title="Cancelar reserva" onClose={() => setModalCancel(null)}>
        {modalCancel && (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
              <AlertTriangle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-700">
                Cancelamentos feitos com menos de 48h de antecedencia nao terao estorno da diaria antecipada.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Motivo</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Descreva o motivo do cancelamento"
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent placeholder:text-zinc-300"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModalCancel(null)}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => cancelMutation.mutate({ id: getId(modalCancel), data: { reason: cancelReason } })}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar reserva'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}