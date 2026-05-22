import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LogIn, BedDouble, ChevronDown, Users, CalendarCheck, X, Check } from 'lucide-react'
import { useFindAll5, getFindAll5QueryKey } from '../../services/booking-controller/booking-controller'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { useFindAll3 } from '../../services/employee-controller/employee-controller'
import { useCheckIn, getFindAll6QueryKey } from '../../services/stay-controller/stay-controller'
import { useAuth } from '../../contexts/AuthContext'

function getId(obj: any): string {
  const id = obj?.id as any
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return id.toString()
}

function formatDate(date?: string) {
  if (!date) return '—'
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

const inputClass = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
const labelClass = "text-xs font-medium text-zinc-500 uppercase tracking-wide"

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

export function CheckIn() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [bookingId, setBookingId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: bookings = [] } = useFindAll5()
  const { data: rooms = [] } = useFindAll1()
  const { data: employees = [] } = useFindAll3()

  const isAdmin = user?.role === 'ADMIN'
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED')

  const checkInMutation = useCheckIn({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getFindAll5QueryKey() })
        queryClient.invalidateQueries({ queryKey: getFindAll6QueryKey() })
        setSuccess(true)
        setShowConfirm(false)
        setBookingId('')
        setEmployeeId('')
      },
    },
  })

  const selectedBooking = confirmedBookings.find((b) => getId(b) === bookingId)

  const selectedEmployee = isAdmin ? employees.find((e) => getId(e) === employeeId) : null

  const getRoomNumber = (roomId: any) => {
    const id = typeof roomId === 'object' && roomId?.$oid ? roomId.$oid : roomId
    return rooms.find((r) => getId(r) === id)?.number ?? '—'
  }

  const handleConfirm = () => {
    setSuccess(false)
    const body: Record<string, string> = { bookingId }
    if (isAdmin) body.employeeId = employeeId
    checkInMutation.mutate({
      data: body as any,
    })
  }



  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">Check-in</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Registre a entrada de hospedes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Formulario */}
        <div className="bg-white rounded-xl border border-zinc-100 p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <LogIn size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-zinc-800">Realizar Check-in</p>
              <p className="text-xs text-zinc-400">Selecione a reserva confirmada</p>
            </div>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
              Check-in realizado com sucesso!
            </div>
          )}

          {checkInMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              Erro ao realizar check-in. Verifique os dados e tente novamente.
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); setShowConfirm(true) }} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Reserva confirmada</label>
              <div className="relative">
                <select value={bookingId} onChange={(e) => { setBookingId(e.target.value); setSuccess(false) }}
                  required className={`${inputClass} appearance-none`}>
                  <option value="">Selecione uma reserva</option>
                  {confirmedBookings.map((b) => (
                    <option key={getId(b)} value={getId(b)}>
                      Quarto {getRoomNumber(b.roomId)} — {formatDate(b.checkInDate)} a {formatDate(b.checkOutDate)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
              {confirmedBookings.length === 0 && (
                <p className="text-xs text-zinc-400">Nenhuma reserva confirmada disponivel</p>
              )}
            </div>

            {isAdmin && (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Funcionario responsavel</label>
                <div className="relative">
                  <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                    required className={`${inputClass} appearance-none`}>
                    <option value="">Selecione um funcionario</option>
                    {employees.map((emp) => (
                      <option key={getId(emp)} value={getId(emp)}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                </div>
              </div>
            )}

            <button type="submit" disabled={!bookingId || (isAdmin && !employeeId)}
              className="mt-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              <LogIn size={16} />
              Revisar Check-in
            </button>
          </form>
        </div>

        {/* Preview da reserva selecionada */}
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-zinc-500">Detalhes da reserva</p>

          {!selectedBooking ? (
            <div className="bg-white rounded-xl border border-dashed border-zinc-200 p-8 flex flex-col items-center justify-center gap-2 text-center">
              <CalendarCheck size={32} className="text-zinc-200" />
              <p className="text-sm text-zinc-400">Selecione uma reserva para ver os detalhes</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <BedDouble size={18} className="text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-800">Quarto {getRoomNumber(selectedBooking.roomId)}</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Confirmada</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-zinc-50 pt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Check-in previsto</span>
                  <span className="text-sm font-medium text-zinc-800">{formatDate(selectedBooking.checkInDate)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Check-out previsto</span>
                  <span className="text-sm font-medium text-zinc-800">{formatDate(selectedBooking.checkOutDate)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Diaria</span>
                  <span className="text-sm font-medium text-zinc-800">R$ {selectedBooking.dailyRate?.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Adiantamento</span>
                  <span className="text-sm font-medium text-zinc-800">R$ {selectedBooking.advancePayment?.toFixed(2)}</span>
                </div>
              </div>

              {selectedBooking.guests && selectedBooking.guests.length > 0 && (
                <div className="border-t border-zinc-50 pt-3 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Users size={13} />
                    <span>{selectedBooking.guests.length} hospede(s)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmacao */}
      <Modal open={showConfirm} title="Confirmar Check-in" onClose={() => !checkInMutation.isPending && setShowConfirm(false)}>
        {selectedBooking && (
          <div className="flex flex-col gap-5">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
              <BedDouble size={20} className="text-blue-500 shrink-0" />
              <div>
                <p className="font-semibold text-zinc-800">Quarto {getRoomNumber(selectedBooking.roomId)}</p>
                <p className="text-xs text-zinc-500">
                  {formatDate(selectedBooking.checkInDate)} ate {formatDate(selectedBooking.checkOutDate)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-400">Diaria</span>
                <span className="text-sm font-semibold text-zinc-800">R$ {selectedBooking.dailyRate?.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-400">Adiantamento</span>
                <span className="text-sm font-semibold text-zinc-800">R$ {selectedBooking.advancePayment?.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-400">Hospedes</span>
                <span className="text-sm font-semibold text-zinc-800">{selectedBooking.guests?.length ?? 1}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-400">Responsavel</span>
                <span className="text-sm font-semibold text-zinc-800">
                  {isAdmin && selectedEmployee ? selectedEmployee.name : user?.email}
                </span>
              </div>
            </div>

            {checkInMutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
                Erro ao realizar check-in. Verifique os dados e tente novamente.
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button onClick={() => setShowConfirm(false)} disabled={checkInMutation.isPending}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Voltar
              </button>
              <button onClick={handleConfirm} disabled={checkInMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg transition-colors">
                <Check size={15} />
                {checkInMutation.isPending ? 'Processando...' : 'Confirmar Check-in'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}