import { useState } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X, CalendarCheck, Hotel, AlertTriangle, Plus } from 'lucide-react'
import {
  useCancel,
} from '../../services/booking-controller/booking-controller'
import { customInstance } from '../../lib/axios'
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
  CHECKIN: 'bg-verde/10 text-verde',
  CHECKOUT: 'bg-zinc-100 text-zinc-500',
  CANCELLED: 'bg-red-100 text-red-500',
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
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

export function MyReservations() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [modalCancel, setModalCancel] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  const myBookingsKey = ['my-bookings']
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: myBookingsKey,
    queryFn: () => customInstance<Booking[]>({ url: '/bookings/my', method: 'GET' }),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: myBookingsKey })

  const cancelMutation = useCancel({
    mutation: {
      onSuccess: () => {
        invalidate()
        setModalCancel(null)
        setCancelReason('')
      },
    },
  })

  const canCancel = (booking: Booking) =>
    booking.status === 'CONFIRMED' || booking.status === 'PENDING'

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-amber-400 rounded-xl p-2.5">
            <CalendarCheck size={24} className="text-zinc-800" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-800">Minhas reservas</h1>
            <p className="text-sm text-zinc-500">Venha ver os quartos disponíveis</p>
          </div>
        </div>
        <button onClick={() => navigate('/client/bookings')}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-semibold text-sm px-5 py-3 rounded-lg transition-colors shadow-sm">
          <Plus size={18} /> Fazer nova reserva
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-400">Carregando...</div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-zinc-100">
          <CalendarCheck size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhuma reserva encontrada</p>
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
                    {booking.advancePayment != null && booking.advancePayment > 0 && (
                      <span>Adto: <span className="text-zinc-600 font-medium">R$ {booking.advancePayment.toFixed(2)}</span></span>
                    )}
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
