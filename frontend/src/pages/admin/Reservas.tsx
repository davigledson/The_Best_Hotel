import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, X, Search, Calendar, BedDouble, Users, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useFindAll5,
  useCreate5,
  getFindAll5QueryKey,
  useCancel,
  useApprove,
} from '../../services/booking-controller/booking-controller'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { useFindAll4 } from '../../services/client-controller/client-controller'
import type { Booking, BookingStatus } from '../../services/openAPIDefinition.schemas'
import { useAuth } from '../../contexts/AuthContext'

const PAGE_SIZE = 20

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendente',   color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Confirmada', color: 'bg-verde/10 text-verde' },
  CANCELLED: { label: 'Cancelada',  color: 'bg-red-100 text-red-600' },
  CHECKIN:   { label: 'Check-in',   color: 'bg-blue-100 text-blue-700' },
  CHECKOUT:  { label: 'Check-out',  color: 'bg-zinc-100 text-zinc-600' },
}

function getId(obj: any): string {
  const id = obj?.id as unknown as { $oid?: string } | string
  if (typeof id === 'string') return id
  if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''
  return ''
}

function formatDate(date?: string) {
  if (!date) return '—'
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

function getRoomId(roomId: any): string {
  if (!roomId) return ''
  if (typeof roomId === 'string') return roomId
  if (roomId.$oid) return roomId.$oid
  return String(roomId)
}

interface ModalProps { open: boolean; title: string; onClose: () => void; children: React.ReactNode }
function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-zinc-800">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const selectClass = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent bg-white appearance-none"
const labelClass = "text-xs font-medium text-zinc-500 uppercase tracking-wide"
const inputClass = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent bg-white"

interface BookingFormProps {
  onSubmit: (data: Booking) => void
  loading: boolean
  error: string | null
}

function BookingForm({ onSubmit, loading, error }: BookingFormProps) {
  const { data: rooms = [] } = useFindAll1()
  const { data: clients = [] } = useFindAll4()
  const { data: bookings = [] } = useFindAll5()

  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedRooms, setSelectedRooms] = useState<{ roomId: string; numberOfGuests: number }[]>([])

  const conflictRoomIds = new Set<string>()

  if (checkInDate && checkOutDate) {
    for (const b of bookings) {
      if (!b.checkInDate || !b.checkOutDate || b.status === 'CANCELLED' || b.status === 'CHECKOUT') continue
      if (checkInDate >= b.checkOutDate || checkOutDate <= b.checkInDate) continue
      const roomIds = b.rooms?.map((r) => getRoomId(r.roomId)) ?? []
      roomIds.forEach((id) => conflictRoomIds.add(id))
    }
  }

  const visibleRooms = rooms.filter((r) => r.status === 'AVAILABLE' && !conflictRoomIds.has(getRoomId(r.id)))

  const toggleRoom = (roomId: string) => {
    setSelectedRooms((prev) => {
      const exists = prev.find((r) => r.roomId === roomId)
      if (exists) return prev.filter((r) => r.roomId !== roomId)
      const room = rooms.find((r) => getRoomId(r.id) === roomId)
      const cap = room?.capacity ?? 1
      return [...prev, { roomId, numberOfGuests: Math.min(2, cap) }]
    })
  }

  const updateGuests = (roomId: string, guests: number) => {
    setSelectedRooms((prev) =>
      prev.map((r) => (r.roomId === roomId ? { ...r, numberOfGuests: Math.max(1, guests) } : r))
    )
  }

  const advancePayment = selectedRooms.reduce((sum, sr) => {
    const room = rooms.find((r) => getRoomId(r.id) === sr.roomId)
    return sum + (room?.dailyRate ?? 0)
  }, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId || selectedRooms.length === 0) return
    const roomsPayload = selectedRooms.map((sr) => {
      const room = rooms.find((r) => getRoomId(r.id) === sr.roomId)!
      return { roomId: sr.roomId as any, dailyRate: room.dailyRate, numberOfGuests: sr.numberOfGuests }
    })
    onSubmit({
      rooms: roomsPayload as any,
      checkInDate,
      checkOutDate,
      advancePayment,
      guests: [{ clientId: selectedClientId as any, holder: true }],
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Datas */}
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className={labelClass}>Check-in</label>
          <input type="date" value={checkInDate} onChange={(e) => { setCheckInDate(e.target.value); setSelectedRooms([]) }} required
            className={inputClass} />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <label className={labelClass}>Check-out</label>
          <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} required
            min={checkInDate} className={inputClass} />
        </div>
      </div>

      {/* Quartos */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Quartos ({selectedRooms.length} selecionado(s))</label>
        <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
          {visibleRooms.map((r) => {
            const rid = getRoomId(r.id)
            const selected = selectedRooms.find((sr) => sr.roomId === rid)
            return (
              <label key={rid} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors ${selected ? 'bg-amber-50' : ''}`}>
                <input type="checkbox" checked={!!selected} onChange={() => toggleRoom(rid)}
                  className="accent-amber-400 w-4 h-4 rounded" />
                <span className="flex-1 text-sm text-zinc-700">
                  Quarto {r.number} — {r.type} — R$ {r.dailyRate?.toFixed(2)}/dia
                </span>
                {selected && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-zinc-400">Hosp:</span>
                    <input type="number" min={1} max={r.capacity} value={selected.numberOfGuests}
                      onChange={(e) => updateGuests(rid, parseInt(e.target.value) || 1)}
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

      {/* Adiantamento */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-amber-700">Adiantamento (1a diaria de cada quarto)</span>
        <span className="text-base font-bold text-amber-700">R$ {advancePayment.toFixed(2)}</span>
      </div>

      {/* Cliente titular */}
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Cliente titular</label>
        <div className="relative">
          <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} required className={selectClass}>
            <option value="">Selecione um cliente</option>
            {clients.map((c) => (
              <option key={getId(c)} value={getId(c)}>
                {c.name} — {c.cpf}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      <button type="submit" disabled={loading || selectedRooms.length === 0}
        className="mt-1 bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors">
        {loading ? 'Salvando...' : 'Cadastrar reserva'}
      </button>
    </form>
  )
}

export function Reservas() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [page, setPage] = useState(0)
  const [modalCreate, setModalCreate] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null)
  const [confirmApprove, setConfirmApprove] = useState<Booking | null>(null)

  const { data: bookings = [], isLoading } = useFindAll5()
  const { data: rooms = [] } = useFindAll1()

  const roomsById = new Map(rooms.map((r) => [getRoomId(r.id), r]))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll5QueryKey() })

  const createMutation = useCreate5({
    mutation: { onSuccess: () => { invalidate(); setModalCreate(false) } },
  })

  const cancelMutation = useCancel({
    mutation: { onSuccess: () => { invalidate(); setConfirmCancel(null) } },
  })

  const approveMutation = useApprove({
    mutation: { onSuccess: () => { invalidate(); setConfirmApprove(null) } },
  })

  const getRoomNumbers = (booking: Booking) => {
    return booking.rooms?.map((r) => {
      const room = roomsById.get(getRoomId(r.roomId))
      return room?.number ?? '—'
    }).join(', ') ?? '—'
  }

  const getTotalGuests = (booking: Booking) => {
    return booking.rooms?.reduce((s, r) => s + (r.numberOfGuests ?? 1), 0) ?? 0
  }

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase()
    const matchSearch =
      getRoomNumbers(b).toLowerCase().includes(q) ||
      (b.status ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter ? b.status === statusFilter : true
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const counts = Object.keys(statusConfig).reduce((acc, key) => {
    acc[key] = bookings.filter((b) => b.status === key).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Reservas</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie as reservas do hotel</p>
        </div>
        <button onClick={() => setModalCreate(true)}
          className="flex items-center gap-2 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors">
          <Plus size={16} /> Nova reserva
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(statusConfig).map(([key, { label, color }]) => (
          <button key={key} onClick={() => { setStatusFilter(statusFilter === key ? '' : key as BookingStatus); setPage(0) }}
            className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${statusFilter === key ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${color}`}>{label}</span>
            <span className="text-2xl font-semibold text-zinc-800">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          placeholder="Buscar por quarto ou status..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent placeholder:text-zinc-300" />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Calendar size={32} className="text-zinc-200" />
            <p className="text-zinc-400 text-sm">Nenhuma reserva encontrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Quarto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Check-in</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Check-out</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Hospedes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Adto.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((b) => {
                const status = statusConfig[b.status ?? ''] ?? { label: b.status, color: 'bg-zinc-100 text-zinc-500' }
                const canCancel = b.status === 'PENDING' || b.status === 'CONFIRMED'
                return (
                  <tr key={getId(b)} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                          <BedDouble size={14} className="text-amber-500" />
                        </div>
                        <span className="font-medium text-zinc-800">{getRoomNumbers(b)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(b.checkInDate)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(b.checkOutDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-zinc-500">
                        <Users size={13} />
                        <span>{getTotalGuests(b)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">R$ {b.advancePayment?.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                      {b.status === 'PENDING' && user?.role !== 'CLIENT' && (
                        <button onClick={() => setConfirmApprove(b)}
                          className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 border border-green-200 hover:border-green-400 px-2.5 py-1 rounded-lg transition-colors">
                          <Check size={13} /> Aprovar
                        </button>
                      )}
                      {canCancel && (
                        <button onClick={() => setConfirmCancel(b)}
                          className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1 rounded-lg transition-colors">
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
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

      {/* Modal criar */}
      <Modal open={modalCreate} title="Nova reserva" onClose={() => { setModalCreate(false); createMutation.reset() }}>
        <BookingForm
          loading={createMutation.isPending}
          error={createMutation.error ? (createMutation.error as any)?.response?.data?.message ?? (createMutation.error as any)?.message ?? 'Erro ao criar reserva' : null}
          onSubmit={(data) => createMutation.mutate({ data })}
        />
      </Modal>

      {/* Modal cancelar */}
      <Modal open={!!confirmCancel} title="Cancelar reserva" onClose={() => setConfirmCancel(null)}>
        {confirmCancel && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Tem certeza que deseja cancelar a reserva{' '}
              <span className="font-medium text-zinc-800">({getRoomNumbers(confirmCancel)})</span>?
              Esta acao pode estar sujeita a regras de estorno.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmCancel(null)}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Voltar
              </button>
              <button
                onClick={() => cancelMutation.mutate({ id: getId(confirmCancel), data: {} })}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors">
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal aprovar */}
      <Modal open={!!confirmApprove} title="Aprovar reserva" onClose={() => setConfirmApprove(null)}>
        {confirmApprove && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Confirmar a aprovacao da reserva{' '}
              <span className="font-medium text-zinc-800">({getRoomNumbers(confirmApprove)})</span>?
            </p>
            <p className="text-xs text-zinc-400">
              Apos aprovada, a reserva ficara disponivel para check-in.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmApprove(null)}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Voltar
              </button>
              <button
                onClick={() => approveMutation.mutate({ id: getId(confirmApprove) })}
                disabled={approveMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors">
                {approveMutation.isPending ? 'Aprovando...' : 'Confirmar aprovacao'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}