import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ShoppingCart, X, ChevronLeft, ChevronRight, Plus, CalendarRange, Trash2, Check, AlertTriangle, Hotel, Minus } from 'lucide-react'
import { useCreate5, useFindAll5 } from '../../services/booking-controller/booking-controller'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { customInstance } from '../../lib/axios'
import type { Booking } from '../../services/openAPIDefinition.schemas'

const ITEMS_PER_PAGE = 8

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

const getRoomId = (roomId: any): string => {
  if (!roomId) return ''
  if (typeof roomId === 'string') return roomId
  if (roomId.$oid) return roomId.$oid
  return String(roomId)
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-800">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export function MyBookings() {
  const queryClient = useQueryClient()
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState<{ roomId: string; roomNumber: string; roomType: string; dailyRate: number; numberOfGuests: number; capacity: number }[]>([])
  const [detailRoom, setDetailRoom] = useState<any>(null)
  const [detailGuests, setDetailGuests] = useState(1)
  const [showCart, setShowCart] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [createConflictData, setCreateConflictData] = useState<ConflictData | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const lastCreateData = useRef<any>(null)

  const { data: rooms = [] } = useFindAll1()
  const { data: allBookings = [] } = useFindAll5()

  const myBookingsKey = ['my-bookings']
  const { data: myBookings = [] } = useQuery({
    queryKey: myBookingsKey,
    queryFn: () => customInstance<Booking[]>({ url: '/bookings/my', method: 'GET' }),
  })

  const clientConflict = useMemo(() => {
    if (!checkInDate || !checkOutDate) return null
    for (const b of myBookings) {
      if (!b.checkInDate || !b.checkOutDate) continue
      if (b.status !== 'CONFIRMED' && b.status !== 'CHECKIN') continue
      if (checkInDate >= b.checkOutDate || checkOutDate <= b.checkInDate) continue
      return b
    }
    return null
  }, [myBookings, checkInDate, checkOutDate])

  const conflictRoomIds = useMemo(() => {
    const ids = new Set<string>()
    if (!checkInDate || !checkOutDate) return ids
    for (const b of allBookings) {
      if (!b.checkInDate || !b.checkOutDate || b.status === 'CANCELLED' || b.status === 'CHECKOUT' || b.status === 'PENDING') continue
      if (checkInDate >= b.checkOutDate || checkOutDate <= b.checkInDate) continue
      const roomIds = b.rooms?.map((r) => getRoomId(r.roomId)) ?? []
      roomIds.forEach((id) => ids.add(id))
    }
    return ids
  }, [allBookings, checkInDate, checkOutDate])

  const availableRooms = useMemo(() => {
    if (!checkInDate || !checkOutDate) return []
    return rooms.filter((r: any) =>
      r.status === 'AVAILABLE' && !conflictRoomIds.has(getRoomId(r.id))
    )
  }, [rooms, conflictRoomIds, checkInDate, checkOutDate])

  const totalPages = Math.max(1, Math.ceil(availableRooms.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginatedRooms = availableRooms.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  )

  useEffect(() => { setPage(1) }, [checkInDate, checkOutDate])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const cartCount = cart.length
  const advanceTotal = cart.reduce((s, item) => s + item.dailyRate, 0)
  const nights = checkInDate && checkOutDate
    ? Math.max(1, Math.floor((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const today = new Date().toISOString().split('T')[0]
  const minCheckOut = checkInDate
    ? (() => {
        const [y, m, d] = checkInDate.split('-').map(Number)
        const next = new Date(y, m - 1, d + 1)
        return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
      })()
    : today

  const invalidate = () => queryClient.invalidateQueries({ queryKey: myBookingsKey })

  const createMutation = useCreate5({
    mutation: {
      onSuccess: (data) => {
        invalidate()
        setCreateConflictData(null)
        const msg = (data as any)?.warningMessage
        if (msg) {
          setWarningMessage(msg)
          setSuccessMsg('Reserva criada com sucesso!')
        } else {
          setSuccessMsg('Reserva criada com sucesso!')
        }
        setCart([])
        setSubmitError(null)
      },
      onError: (error) => {
        const data = (error as any)?.response?.data as ConflictData | undefined
        if (data?.type === 'BLOCKING' || data?.type === 'PENDING') {
          setCreateConflictData(data)
        }
      },
    },
  })

  const handleCreate = () => {
    setSubmitError(null)
    if (cart.length === 0) {
      setSubmitError('Selecione pelo menos um quarto')
      return
    }
    const roomsPayload = cart.map((item) => ({
      roomId: item.roomId as any,
      dailyRate: item.dailyRate,
      numberOfGuests: item.numberOfGuests,
    }))
    const bookingData = {
      rooms: roomsPayload as any,
      checkInDate: checkInDate as any,
      checkOutDate: checkOutDate as any,
      advancePayment: advanceTotal,
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
    setDetailRoom(null)
  }

  const removeFromCart = (roomId: string) => {
    setCart(cart.filter((item) => item.roomId !== roomId))
  }

  const updateGuests = (roomId: string, guests: number) => {
    setCart(cart.map((item) =>
      item.roomId === roomId ? { ...item, numberOfGuests: Math.max(1, Math.min(guests, item.capacity)) } : item
    ))
  }

  const openDetail = (room: any) => {
    setDetailRoom(room)
    setDetailGuests(Math.min(2, room.capacity ?? 1))
  }

  useEffect(() => { if (cart.length === 0) setShowCart(false) }, [cart])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Reservar quartos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Escolha as datas e os quartos para sua estadia</p>
        </div>
        {cartCount > 0 && (
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative flex items-center gap-2 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            <ShoppingCart size={16} />
            Carrinho
            <span className="bg-zinc-900 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide shrink-0">Chegada</label>
            <input
              type="date"
              value={checkInDate}
              min={today}
              max={checkOutDate || ''}
              onChange={(e) => {
                const val = e.target.value
                setCheckInDate(val)
                if (checkOutDate && val >= checkOutDate) setCheckOutDate('')
                setCart([])
                setSubmitError(null)
                setSuccessMsg(null)
              }}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde"
            />
          </div>
          <span className="text-zinc-300 text-lg">→</span>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide shrink-0">Saída</label>
            <input
              type="date"
              value={checkOutDate}
              min={minCheckOut}
              onChange={(e) => { setCheckOutDate(e.target.value); setCart([]); setSubmitError(null); setSuccessMsg(null) }}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde"
            />
          </div>
          {nights > 0 && (
            <span className="text-sm text-zinc-500 bg-zinc-50 px-3 py-1.5 rounded-lg">
              {nights} {nights === 1 ? 'noite' : 'noites'}
            </span>
          )}
          {checkInDate && checkOutDate && (
            <span className="text-xs text-zinc-400">
              {availableRooms.length} quarto(s) disponivel(is)
            </span>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-verde/10 border border-verde/20 text-verde text-sm px-5 py-3 rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2"><Check size={16} />{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-verde/70 hover:text-verde"><X size={16} /></button>
        </div>
      )}

      {warningMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-5 py-3 rounded-xl flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{warningMessage}</span>
          <button onClick={() => setWarningMessage(null)} className="text-amber-500 hover:text-amber-700 font-medium shrink-0">Fechar</button>
        </div>
      )}

      {!checkInDate || !checkOutDate ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-xl border border-zinc-100">
          <CalendarRange size={40} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Selecione as datas de check-in e check-out</p>
          <p className="text-xs text-zinc-300">Os quartos disponiveis aparecerao aqui</p>
        </div>
      ) : clientConflict ? (
        <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border-b border-red-100">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-red-700">Conflito de datas</h2>
              <p className="text-xs text-red-600">Voce ja possui uma reserva ou estadia ativa neste periodo</p>
            </div>
          </div>
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <Hotel size={18} className="text-zinc-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-800">
                  {clientConflict.rooms?.length ?? 1} quarto(s)
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass[clientConflict.status ?? ''] ?? ''}`}>
                  {statusLabel[clientConflict.status ?? ''] ?? clientConflict.status}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Chegada: {String(clientConflict.checkInDate)} → Saída: {String(clientConflict.checkOutDate)}
              </p>
            </div>
          </div>
        </div>
      ) : availableRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-zinc-100">
          <Hotel size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhum quarto disponivel para este periodo</p>
        </div>
      ) : (
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {paginatedRooms.map((room: any) => {
                const rid = getRoomId(room.id)
                const inCart = cart.some((item) => item.roomId === rid)
                return (
                  <div key={rid} className={`bg-white rounded-xl border ${inCart ? 'border-amber-300 bg-amber-50/30' : 'border-zinc-100'} p-4 flex flex-col gap-2 hover:shadow-sm transition-all`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">Quarto {room.number}</p>
                        <p className="text-xs text-zinc-400">{room.type}</p>
                      </div>
                      {inCart && (
                        <span className="text-[10px] bg-amber-400 text-zinc-900 font-medium px-1.5 py-0.5 rounded-full">No carrinho</span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2">{room.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>Cap: {room.capacity} hosp</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-1">
                      <span className="text-sm font-bold text-zinc-800">R$ {room.dailyRate?.toFixed(2)}<span className="text-[10px] font-normal text-zinc-400">/dia</span></span>
                      <button
                        onClick={() => openDetail(room)}
                        className="flex items-center gap-1 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-xs px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={12} />
                        Adicionar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-4">
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number
                  if (totalPages <= 7) {
                    p = i + 1
                  } else if (safePage <= 4) {
                    p = i + 1
                  } else if (safePage >= totalPages - 3) {
                    p = totalPages - 6 + i
                  } else {
                    p = safePage - 3 + i
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[36px] h-9 text-sm font-medium rounded-lg transition-colors ${
                        p === safePage
                          ? 'bg-amber-400 text-zinc-900'
                          : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>

          {showCart && cart.length > 0 && (
            <div className="w-72 shrink-0">
              <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden sticky top-6">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-50">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={16} className="text-zinc-400" />
                    <h2 className="text-sm font-semibold text-zinc-700">Carrinho</h2>
                  </div>
                  <button onClick={() => setShowCart(false)} className="text-zinc-400 hover:text-zinc-700">
                    <X size={16} />
                  </button>
                </div>
                <div className="divide-y divide-zinc-50">
                  {cart.map((item) => (
                    <div key={item.roomId} className="px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-800">Quarto {item.roomNumber}</p>
                          <p className="text-xs text-zinc-400">{item.roomType}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.roomId)}
                          className="text-zinc-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateGuests(item.roomId, item.numberOfGuests - 1)}
                            disabled={item.numberOfGuests <= 1}
                            className="w-6 h-6 rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="text-xs text-zinc-500 w-8 text-center">{item.numberOfGuests} hosp</span>
                          <button
                            onClick={() => updateGuests(item.roomId, item.numberOfGuests + 1)}
                            disabled={item.numberOfGuests >= item.capacity}
                            className="w-6 h-6 rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs text-zinc-500">R$ {item.dailyRate.toFixed(2)}/dia</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-700">Adiantamento (1a diaria)</span>
                    <span className="text-sm font-bold text-amber-700">R$ {advanceTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="w-full bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors"
                  >
                    {createMutation.isPending ? 'Reservando...' : 'Finalizar reserva'}
                  </button>
                  {(submitError || mutationError) && (
                    <p className="text-xs text-red-500 mt-2 text-center">{submitError || mutationError}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={!!detailRoom} title={detailRoom ? `Quarto ${detailRoom.number} - ${detailRoom.type}` : ''} onClose={() => setDetailRoom(null)}>
        {detailRoom && (
          <div className="flex flex-col gap-4">
            <div className="bg-zinc-50 rounded-lg px-4 py-3">
              <p className="text-xs text-zinc-400">{detailRoom.description || 'Sem descricao disponivel'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-zinc-100 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Capacidade</p>
                <p className="text-sm font-semibold text-zinc-800">Ate {detailRoom.capacity} hospedes</p>
              </div>
              <div className="bg-white border border-zinc-100 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Diaria</p>
                <p className="text-sm font-semibold text-zinc-800">R$ {detailRoom.dailyRate?.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Numero de hospedes</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailGuests(Math.max(1, detailGuests - 1))}
                  disabled={detailGuests <= 1}
                  className="w-9 h-9 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 flex items-center justify-center"
                >
                  <Minus size={16} />
                </button>
                <span className="flex-1 text-center text-lg font-semibold text-zinc-800">{detailGuests}</span>
                <button
                  onClick={() => setDetailGuests(Math.min(detailRoom.capacity ?? 99, detailGuests + 1))}
                  disabled={detailGuests >= (detailRoom.capacity ?? 99)}
                  className="w-9 h-9 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 flex items-center justify-center"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            {cart.some((item) => item.roomId === getRoomId(detailRoom.id)) ? (
              <div className="bg-verde/10 text-verde text-sm font-medium text-center py-2.5 rounded-lg">
                Quarto ja adicionado ao carrinho
              </div>
            ) : (
              <button
                onClick={() => addToCart(detailRoom, detailGuests)}
                className="bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart size={16} />
                Adicionar ao carrinho
              </button>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!createConflictData} title="Conflitos encontrados" onClose={() => { setCreateConflictData(null); lastCreateData.current = null; createMutation.reset() }}>
        {createConflictData && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">{createConflictData.message}</p>
            <div className="overflow-x-auto border border-zinc-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="text-left px-3 py-2 font-medium text-zinc-500">Quarto(s)</th>
                    <th className="text-left px-3 py-2 font-medium text-zinc-500">Chegada</th>
                    <th className="text-left px-3 py-2 font-medium text-zinc-500">Saída</th>
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
    </div>
  )
}
