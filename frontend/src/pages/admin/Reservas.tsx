import { useState, useRef, useMemo, useEffect } from 'react'
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

const ITEMS_PER_PAGE_FORM = 6

interface BookingFormProps {
  onSubmit: (data: Booking) => void
  loading: boolean
  error: string | null
  warningMessage: string | null
  onDismissWarning: () => void
}

function BookingForm({ onSubmit, loading, error, warningMessage, onDismissWarning }: BookingFormProps) {
  const { data: rooms = [] } = useFindAll1()
  const { data: clients = [] } = useFindAll4()
  const { data: bookings = [] } = useFindAll5()

  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [cart, setCart] = useState<{ roomId: string; roomNumber: string; roomType: string; dailyRate: number; numberOfGuests: number; capacity: number }[]>([])
  const [page, setPage] = useState(1)
  const [detailRoom, setDetailRoom] = useState<any>(null)
  const [detailGuests, setDetailGuests] = useState(1)

  const today = new Date().toISOString().split('T')[0]
  const minCheckOut = checkInDate
    ? (() => {
        const [y, m, d] = checkInDate.split('-').map(Number)
        const next = new Date(y, m - 1, d + 1)
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
      })()
    : today

  const conflictRoomIds = useMemo(() => {
    const ids = new Set<string>()
    if (!checkInDate || !checkOutDate) return ids
    for (const b of bookings) {
      if (!b.checkInDate || !b.checkOutDate || b.status === 'CANCELLED' || b.status === 'CHECKOUT' || b.status === 'PENDING') continue
      if (checkInDate >= b.checkOutDate || checkOutDate <= b.checkInDate) continue
      const roomIds = b.rooms?.map((r) => getRoomId(r.roomId)) ?? []
      roomIds.forEach((id) => ids.add(id))
    }
    return ids
  }, [bookings, checkInDate, checkOutDate])

  const availableRooms = useMemo(() => {
    if (!checkInDate || !checkOutDate) return []
    return rooms.filter((r: any) =>
      r.status === 'AVAILABLE' && !conflictRoomIds.has(getRoomId(r.id))
    )
  }, [rooms, conflictRoomIds, checkInDate, checkOutDate])

  const totalPages = Math.max(1, Math.ceil(availableRooms.length / ITEMS_PER_PAGE_FORM))
  const safePage = Math.min(page, totalPages)
  const paginatedRooms = availableRooms.slice(
    (safePage - 1) * ITEMS_PER_PAGE_FORM,
    safePage * ITEMS_PER_PAGE_FORM
  )

  useEffect(() => { setPage(1) }, [checkInDate, checkOutDate])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const advancePayment = cart.reduce((sum, item) => sum + item.dailyRate, 0)

  const addToCart = (room: any, guests: number) => {
    const rid = getRoomId(room.id)
    if (cart.some((item) => item.roomId === rid)) return
    setCart([...cart, {
      roomId: rid,
      roomNumber: room.number ?? '',
      roomType: room.type ?? '',
      dailyRate: room.dailyRate ?? 0,
      numberOfGuests: guests,
      capacity: room.capacity ?? 1,
    }])
  }

  const removeFromCart = (roomId: string) => {
    setCart(cart.filter((item) => item.roomId !== roomId))
  }

  const updateGuests = (roomId: string, guests: number) => {
    setCart(cart.map((item) =>
      item.roomId === roomId ? { ...item, numberOfGuests: Math.max(1, Math.min(guests, item.capacity)) } : item
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId || cart.length === 0) return
    const roomsPayload = cart.map((item) => ({
      roomId: item.roomId as any,
      dailyRate: item.dailyRate,
      numberOfGuests: item.numberOfGuests,
    }))
    onSubmit({
      rooms: roomsPayload as any,
      checkInDate,
      checkOutDate,
      advancePayment,
      guests: [{ clientId: selectedClientId as any, holder: true }],
    })
  }

  const openDetail = (room: any) => {
    setDetailRoom(room)
    setDetailGuests(Math.min(2, room.capacity ?? 1))
  }

  const closeDetail = () => setDetailRoom(null)

  const roomInCart = (roomId: string) => cart.some((item) => item.roomId === roomId)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {warningMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
          <span className="flex-1">{warningMessage}</span>
          <button type="button" onClick={onDismissWarning} className="text-amber-500 hover:text-amber-700 font-medium text-xs whitespace-nowrap">
            Fechar
          </button>
        </div>
      )}

      {/* Datas */}
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className={labelClass}>Chegada</label>
          <input type="date" value={checkInDate}
            min={today} max={checkOutDate || ''}
            onChange={(e) => {
              const val = e.target.value
              setCheckInDate(val)
              if (checkOutDate && val >= checkOutDate) setCheckOutDate('')
              setCart([])
            }}
            required className={inputClass} />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <label className={labelClass}>Saida</label>
          <input type="date" value={checkOutDate}
            min={minCheckOut}
            onChange={(e) => setCheckOutDate(e.target.value)}
            required className={inputClass} />
        </div>
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

      {/* Quartos */}
      {checkInDate && checkOutDate && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className={labelClass}>Quartos disponiveis ({availableRooms.length})</label>
            {cart.length > 0 && (
              <span className="text-xs text-amber-600 font-medium">{cart.length} no carrinho</span>
            )}
          </div>

          {detailRoom ? (
            <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Quarto {detailRoom.number} — {detailRoom.type}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{detailRoom.description || 'Sem descricao'}</p>
                </div>
                <button type="button" onClick={closeDetail} className="text-zinc-400 hover:text-zinc-700"><X size={16} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white rounded-lg px-3 py-2 border border-zinc-100">
                  <p className="text-[10px] text-zinc-400">Capacidade</p>
                  <p className="text-sm font-semibold text-zinc-800">Ate {detailRoom.capacity} hosp</p>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 border border-zinc-100">
                  <p className="text-[10px] text-zinc-400">Diaria</p>
                  <p className="text-sm font-semibold text-zinc-800">R$ {detailRoom.dailyRate?.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <button type="button" onClick={() => setDetailGuests(Math.max(1, detailGuests - 1))} disabled={detailGuests <= 1}
                  className="w-8 h-8 rounded border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 flex items-center justify-center">-</button>
                <span className="text-sm font-semibold text-zinc-800 w-8 text-center">{detailGuests} hosp</span>
                <button type="button" onClick={() => setDetailGuests(Math.min(detailRoom.capacity ?? 99, detailGuests + 1))} disabled={detailGuests >= (detailRoom.capacity ?? 99)}
                  className="w-8 h-8 rounded border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 flex items-center justify-center">+</button>
              </div>
              {roomInCart(getRoomId(detailRoom.id)) ? (
                <p className="text-xs text-verde font-medium text-center py-2 bg-verde/5 rounded-lg">Quarto ja no carrinho</p>
              ) : (
                <button type="button" onClick={() => { addToCart(detailRoom, detailGuests); closeDetail() }}
                  className="w-full bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm py-2 rounded-lg transition-colors">
                  Adicionar ao carrinho
                </button>
              )}
            </div>
          ) : availableRooms.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6 bg-zinc-50 rounded-xl">Nenhum quarto disponivel para este periodo</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {paginatedRooms.map((room: any) => {
                  const rid = getRoomId(room.id)
                  const inCart = roomInCart(rid)
                  return (
                    <div key={rid} className={`bg-white rounded-xl border ${inCart ? 'border-amber-300 bg-amber-50/30' : 'border-zinc-100'} p-3 flex flex-col gap-1.5`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-zinc-800">Quarto {room.number}</p>
                          <p className="text-[10px] text-zinc-400">{room.type}</p>
                        </div>
                        {inCart && <span className="text-[9px] bg-amber-400 text-zinc-900 font-medium px-1 py-0.5 rounded-full">OK</span>}
                      </div>
                      <p className="text-[10px] text-zinc-400">Cap: {room.capacity} hosp</p>
                      <div className="flex items-center justify-between mt-auto pt-0.5">
                        <span className="text-xs font-bold text-zinc-800">R$ {room.dailyRate?.toFixed(2)}</span>
                        <button type="button" onClick={() => openDetail(room)}
                          className="text-[11px] bg-amber-400 hover:bg-laranja text-zinc-900 font-medium px-2.5 py-1 rounded-lg transition-colors">
                          {inCart ? 'Ver' : '+'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1">
                  <button type="button" onClick={() => setPage(safePage - 1)} disabled={safePage <= 1}
                    className="p-1.5 rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let p: number
                    if (totalPages <= 5) { p = i + 1 }
                    else if (safePage <= 3) { p = i + 1 }
                    else if (safePage >= totalPages - 2) { p = totalPages - 4 + i }
                    else { p = safePage - 2 + i }
                    return (
                      <button key={p} type="button" onClick={() => setPage(p)}
                        className={`min-w-[30px] h-7 text-[11px] font-medium rounded transition-colors ${p === safePage ? 'bg-amber-400 text-zinc-900' : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>
                        {p}
                      </button>
                    )
                  })}
                  <button type="button" onClick={() => setPage(safePage + 1)} disabled={safePage >= totalPages}
                    className="p-1.5 rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Carrinho resumo */}
      {cart.length > 0 && (
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="bg-zinc-50 px-4 py-2 border-b border-zinc-200">
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Carrinho ({cart.length})</p>
          </div>
          <div className="divide-y divide-zinc-100">
            {cart.map((item) => (
              <div key={item.roomId} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-800">Quarto {item.roomNumber} — {item.roomType}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button type="button" onClick={() => updateGuests(item.roomId, item.numberOfGuests - 1)} disabled={item.numberOfGuests <= 1}
                      className="w-5 h-5 rounded border border-zinc-200 text-zinc-400 hover:bg-zinc-50 disabled:opacity-30 flex items-center justify-center text-[10px]">-</button>
                    <span className="text-[10px] text-zinc-500">{item.numberOfGuests} hosp</span>
                    <button type="button" onClick={() => updateGuests(item.roomId, item.numberOfGuests + 1)} disabled={item.numberOfGuests >= item.capacity}
                      className="w-5 h-5 rounded border border-zinc-200 text-zinc-400 hover:bg-zinc-50 disabled:opacity-30 flex items-center justify-center text-[10px]">+</button>
                    <span className="text-[10px] text-zinc-400">R$ {item.dailyRate.toFixed(2)}/dia</span>
                  </div>
                </div>
                <button type="button" onClick={() => removeFromCart(item.roomId)}
                  className="text-zinc-300 hover:text-red-400 shrink-0 ml-2">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adiantamento */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-amber-700">Adiantamento (1a diaria de cada quarto)</span>
        <span className="text-base font-bold text-amber-700">R$ {advancePayment.toFixed(2)}</span>
      </div>

      <button type="submit" disabled={loading || cart.length === 0 || !selectedClientId}
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
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [createConflictData, setCreateConflictData] = useState<ConflictData | null>(null)
  const [approveConflictData, setApproveConflictData] = useState<ConflictData | null>(null)
  const lastCreateData = useRef<any>(null)
  const lastApproveId = useRef<string | null>(null)

  const { data: bookings = [], isLoading } = useFindAll5()
  const { data: rooms = [] } = useFindAll1()

  const roomsById = new Map(rooms.map((r) => [getRoomId(r.id), r]))

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll5QueryKey() })

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
    mutation: { onSuccess: () => { invalidate(); setConfirmCancel(null) } },
  })

  const approveMutation = useApprove({
    mutation: {
      onSuccess: () => { invalidate(); setConfirmApprove(null); setApproveConflictData(null) },
      onError: (error) => {
        const data = (error as any)?.response?.data as ConflictData | undefined
        if (data?.type === 'BLOCKING' || data?.type === 'PENDING') {
          setApproveConflictData(data)
        }
      },
    },
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

  const getErrorMsg = (err: unknown) =>
    (err as any)?.response?.data?.message ?? (err as any)?.message ?? null

  const createErrData = (createMutation.error as any)?.response?.data as ConflictData | undefined
  const isCreateConflict = createErrData?.type === 'BLOCKING' || createErrData?.type === 'PENDING'
  const createFormError = isCreateConflict ? null : getErrorMsg(createMutation.error)

  const approveErrData = (approveMutation.error as any)?.response?.data as ConflictData | undefined
  const isApproveConflict = approveErrData?.type === 'BLOCKING' || approveErrData?.type === 'PENDING'

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
      <Modal open={modalCreate} title="Nova reserva" onClose={() => { setModalCreate(false); setWarningMessage(null); setCreateConflictData(null); createMutation.reset() }}>
        <BookingForm
          loading={createMutation.isPending}
          error={createFormError}
          warningMessage={warningMessage}
          onDismissWarning={() => { setWarningMessage(null); setModalCreate(false) }}
          onSubmit={(data) => { lastCreateData.current = data; createMutation.mutate({ data }) }}
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
                onClick={() => { lastApproveId.current = getId(confirmApprove); approveMutation.mutate({ id: getId(confirmApprove) }) }}
                disabled={approveMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors">
                {approveMutation.isPending ? 'Aprovando...' : 'Confirmar aprovacao'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal conflito (criação) */}
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
                      <td className="px-3 py-2 text-zinc-600">{formatDate(c.checkInDate)}</td>
                      <td className="px-3 py-2 text-zinc-600">{formatDate(c.checkOutDate)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusConfig[c.status]?.color ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {statusConfig[c.status]?.label ?? c.status}
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

      {/* Modal conflito (aprovação) */}
      <Modal open={!!approveConflictData} title="Conflitos encontrados" onClose={() => { setApproveConflictData(null) }}>
        {approveConflictData && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">{approveConflictData.message}</p>
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
                  {approveConflictData.conflicts.map((c) => (
                    <tr key={c.bookingId} className="border-b border-zinc-50">
                      <td className="px-3 py-2 text-zinc-800">{c.roomNumbers || '—'}</td>
                      <td className="px-3 py-2 text-zinc-600">{formatDate(c.checkInDate)}</td>
                      <td className="px-3 py-2 text-zinc-600">{formatDate(c.checkOutDate)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${statusConfig[c.status]?.color ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {statusConfig[c.status]?.label ?? c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setApproveConflictData(null) }}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Voltar
              </button>
              {approveConflictData.type === 'PENDING' && (
                <button onClick={() => {
                  if (lastApproveId.current) approveMutation.mutate({ id: lastApproveId.current, data: { confirmCancelPending: true } })
                  setApproveConflictData(null)
                }}
                  disabled={approveMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg transition-colors">
                  {approveMutation.isPending ? 'Processando...' : 'Sim, cancelar e aprovar'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}