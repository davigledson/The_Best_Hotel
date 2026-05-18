import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, X, CalendarCheck, Hotel, AlertTriangle } from 'lucide-react'
import {
  useFindAll5,
  useCreate5,
  useCancel,
  getFindAll5QueryKey,
} from '../../services/booking-controller/booking-controller'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import type { Booking } from '../../services/openAPIDefinition.schemas'

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
  CHECKIN: 'bg-green-100 text-green-700',
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

export function MyBookings() {
  const queryClient = useQueryClient()
  const [modalCreate, setModalCreate] = useState(false)
  const [modalCancel, setModalCancel] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const [form, setForm] = useState({
    roomId: '',
    checkInDate: '',
    checkOutDate: '',
  })

  const { data: bookings = [], isLoading } = useFindAll5()
  const { data: rooms = [] } = useFindAll1()

  const availableRooms = rooms.filter((r: any) => r.status === 'AVAILABLE')

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll5QueryKey() })

  const createMutation = useCreate5({
    mutation: {
      onSuccess: () => {
        invalidate()
        setModalCreate(false)
        setForm({ roomId: '', checkInDate: '', checkOutDate: '' })
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
    createMutation.mutate({
      data: {
        roomId: form.roomId as any,
        checkInDate: form.checkInDate as any,
        checkOutDate: form.checkOutDate as any,
        guests: [],
      },
    })
  }

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
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
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
                      Quarto {getId({ id: booking.roomId })}

                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass[booking.status ?? ''] ?? 'bg-zinc-100 text-zinc-500'}`}>
                      {statusLabel[booking.status ?? ''] ?? booking.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                    <span>Check-in: <span className="text-zinc-600">{String(booking.checkInDate)}</span></span>
                    <span>Check-out: <span className="text-zinc-600">{String(booking.checkOutDate)}</span></span>
                    <span>Diaria: <span className="text-zinc-600 font-medium">R$ {booking.dailyRate?.toFixed(2)}</span></span>
                  </div>
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
      <Modal open={modalCreate} title="Nova reserva" onClose={() => setModalCreate(false)}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Quarto</label>
            <select
              value={form.roomId}
              onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              required
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            >
              <option value="">Selecione um quarto</option>
              {availableRooms.map((room: any) => (
                <option key={getId(room)} value={getId(room)}>
                  Quarto {room.number} — {room.type} — R$ {room.dailyRate?.toFixed(2)}/dia
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Data de check-in</label>
            <input
              type="date"
              value={form.checkInDate}
              min={today}
              onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
              required
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
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
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>

          <p className="text-xs text-zinc-400">
            Uma diaria sera cobrada antecipadamente como confirmacao da reserva.
          </p>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            {createMutation.isPending ? 'Reservando...' : 'Confirmar reserva'}
          </button>
        </form>
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
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-zinc-300"
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