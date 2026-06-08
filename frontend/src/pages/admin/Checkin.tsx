import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LogIn, BedDouble, Users, CalendarDays, DollarSign, ChevronLeft, ChevronRight, X, Check, UserCheck } from 'lucide-react'
import { useFindAll5, getFindAll5QueryKey } from '../../services/booking-controller/booking-controller'
import { useFindAll1 } from '../../services/room-controller/room-controller'
import { useFindAll3 } from '../../services/employee-controller/employee-controller'
import { useFindAll4 } from '../../services/client-controller/client-controller'
import { useCheckIn, getFindAll6QueryKey } from '../../services/stay-controller/stay-controller'
import { useAuth } from '../../contexts/AuthContext'
import { FilterButton, FilterPanel } from '../../components/FilterPanel'

const PAGE_SIZE = 20

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

function diffDays(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 0
  const a = new Date(checkIn)
  const b = new Date(checkOut)
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000))
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

export function CheckIn() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { data: bookings = [] } = useFindAll5()
  const { data: rooms = [] } = useFindAll1()
  const { data: employees = [] } = useFindAll3()
  const { data: clients = [] } = useFindAll4()

  const isAdmin = user?.role === 'ADMIN'
  const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED')

  const roomsById = useMemo(() => new Map(rooms.map((r) => [getId(r), r])), [rooms])
  const clientsById = useMemo(() => new Map(clients.map((c) => [getId(c), c])), [clients])

  const getRoom = (roomId: any) => {
    const id = typeof roomId === 'object' && roomId?.$oid ? roomId.$oid : roomId
    return roomsById.get(String(id))
  }

  const getClient = (clientId: any) => {
    const id = typeof clientId === 'object' && clientId?.$oid ? clientId.$oid : clientId
    return clientsById.get(String(id))
  }

  const filtered = confirmedBookings.filter((b) => {
    if (filters.clientName) {
      const holder = b.guests?.find((g) => g.holder)
      const client = holder ? getClient(holder.clientId) : null
      if (!(client?.name ?? '').toLowerCase().includes(filters.clientName.toLowerCase())) return false
    }
    if (filters.roomNumber) {
      const room = getRoom(b.rooms?.[0]?.roomId)
      if (!(room?.number ?? '').toLowerCase().includes(filters.roomNumber.toLowerCase())) return false
    }
    if (filters.checkInDate) {
      if (!formatDate(b.checkInDate).includes(filters.checkInDate)) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const selectedBooking = confirmedBookings.find((b) => getId(b) === selectedId)
  const selectedEmployee = employees.find((e) => getId(e) === employeeId)

  const checkInMutation = useCheckIn({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getFindAll5QueryKey() })
        queryClient.invalidateQueries({ queryKey: getFindAll6QueryKey() })
        setSuccess(true)
        setShowConfirm(false)
        setSelectedId(null)
        setEmployeeId('')
      },
    },
  })

  const handleConfirm = () => {
    setSuccess(false)
    const body: Record<string, string> = { bookingId: selectedId! }
    if (isAdmin) body.employeeId = employeeId
    checkInMutation.mutate({ data: body as any })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">Check-in</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Registre a entrada de hospedes</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          Check-in realizado com sucesso!
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
            { key: 'checkInDate', label: 'Data check-in', type: 'text' },
          ]}
          filters={filters}
          onChange={(f) => { setFilters(f); setPage(0) }}
        />
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-100 p-16 flex flex-col items-center justify-center gap-3 text-center">
              <LogIn size={36} className="text-zinc-200" />
              <p className="text-zinc-400 text-sm">Nenhuma reserva confirmada disponivel para check-in</p>
            </div>
          ) : (
            <>
              {/* Grid de cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginated.map((b) => {
                  const room = getRoom(b.rooms?.[0]?.roomId)
                  const holder = b.guests?.find((g) => g.holder)
                  const client = holder ? getClient(holder.clientId) : null
                  const nights = diffDays(b.checkInDate, b.checkOutDate)

                  return (
                    <button key={getId(b)} onClick={() => { setSelectedId(getId(b)); setShowConfirm(false); setEmployeeId('') }}
                      className={`bg-white rounded-xl border p-4 flex flex-col gap-3 text-left transition-all hover:border-amber-300 hover:shadow-sm ${selectedId === getId(b) ? 'border-amber-400 ring-1 ring-amber-400' : 'border-zinc-100'}`}>

                      {/* Topo */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                            <BedDouble size={18} className="text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-800 truncate">
                              {room?.number ? `Quarto ${room.number}` : 'Sem quarto'}
                            </p>
                            <p className="text-xs text-zinc-400 truncate">{room?.type ?? 'Tipo não definido'}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-verde/10 text-verde shrink-0">
                          Confirmada
                        </span>
                      </div>

                      {/* Cliente */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Users size={13} className="text-zinc-300 shrink-0" />
                        <span className="truncate">{client?.name ?? 'Hóspede não identificado'}</span>
                      </div>

                      {/* Datas + diaria */}
                      <div className="border-t border-zinc-50 pt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <CalendarDays size={13} className="text-zinc-300 shrink-0" />
                          <span>{formatDate(b.checkInDate)} — {formatDate(b.checkOutDate)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <DollarSign size={13} className="text-zinc-300 shrink-0" />
                          <span>{(b.rooms?.length ?? 1)} quarto(s) · {nights} noite(s)</span>
                        </div>
                      </div>

                      {/* Selecionar */}
                      <div className="flex gap-2 pt-1">
                        <div className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg">
                          <LogIn size={13} /> Selecionar
                        </div>
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
      <Modal open={!!selectedBooking && !showConfirm} title="Detalhes do Check-in" onClose={() => { setSelectedId(null); setSuccess(false) }}>
        {selectedBooking && (() => {
          const holder = selectedBooking.guests?.find((g) => g.holder)
          const client = holder ? getClient(holder.clientId) : null
          const nights = diffDays(selectedBooking.checkInDate, selectedBooking.checkOutDate)
          const totalGuests = selectedBooking.rooms?.reduce((s, r) => s + (r.numberOfGuests ?? 1), 0) ?? 1
          const sumDailyRates = selectedBooking.rooms?.reduce((s, r) => s + (r.dailyRate ?? 0), 0) ?? 0

          return (
            <div className="flex flex-col gap-5">

              {/* Info booking */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
                <BedDouble size={20} className="text-blue-500 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-800">{selectedBooking.rooms?.length ?? 1} quarto(s) reservado(s)</p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(selectedBooking.checkInDate)} ate {formatDate(selectedBooking.checkOutDate)} · {nights} noite(s)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Cliente</span>
                  <span className="text-sm font-semibold text-zinc-800">{client?.name ?? 'Hóspede não identificado'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Total diarias/dia</span>
                  <span className="text-sm font-semibold text-zinc-800">R$ {sumDailyRates.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Adiantamento</span>
                  <span className="text-sm font-semibold text-zinc-800">R$ {selectedBooking.advancePayment?.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Hospedes</span>
                  <span className="text-sm font-semibold text-zinc-800">{totalGuests}</span>
                </div>
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
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg transition-colors">
                  <LogIn size={15} />
                  Realizar Check-in
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Modal de confirmacao */}
      <Modal open={showConfirm} title="Confirmar Check-in" onClose={() => !checkInMutation.isPending && setShowConfirm(false)}>
        {selectedBooking && (() => {
          const totalGuests = selectedBooking.rooms?.reduce((s, r) => s + (r.numberOfGuests ?? 1), 0) ?? 1
          const sumDailyRates = selectedBooking.rooms?.reduce((s, r) => s + (r.dailyRate ?? 0), 0) ?? 0

          return (
            <div className="flex flex-col gap-5">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
                <BedDouble size={20} className="text-blue-500 shrink-0" />
                <div>
                  <p className="font-semibold text-zinc-800">{selectedBooking.rooms?.length ?? 1} quarto(s)</p>
                  <p className="text-xs text-zinc-500">
                    {formatDate(selectedBooking.checkInDate)} ate {formatDate(selectedBooking.checkOutDate)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Total diarias/dia</span>
                  <span className="text-sm font-semibold text-zinc-800">R$ {sumDailyRates.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Adiantamento</span>
                  <span className="text-sm font-semibold text-zinc-800">R$ {(selectedBooking.advancePayment ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-zinc-400">Hospedes</span>
                  <span className="text-sm font-semibold text-zinc-800">{totalGuests}</span>
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
          )
        })()}
      </Modal>
    </div>
  )
}
