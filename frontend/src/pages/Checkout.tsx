import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, BedDouble, ChevronDown, ShoppingBasket, DollarSign, CalendarCheck } from 'lucide-react'
import { useFindAll1 } from '../services/room-controller/room-controller'
import { useFindAll3 } from '../services/employee-controller/employee-controller'
import { useCheckOut, useFindAll6, getFindAll6QueryKey } from '../services/stay-controller/stay-controller'
import { getFindAll5QueryKey } from '../services/booking-controller/booking-controller'

function getId(obj: any): string {
  const id = obj?.id as any
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return id.toString()
}

function formatDate(date?: string) {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('pt-BR')
  } catch {
    return date
  }
}

const inputClass = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent bg-white"
const labelClass = "text-xs font-medium text-zinc-500 uppercase tracking-wide"

export function CheckOut() {
  const queryClient = useQueryClient()
  const [stayId, setStayId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [success, setSuccess] = useState(false)

  const { data: stays = [] } = useFindAll6()
  const { data: rooms = [] } = useFindAll1()
  const { data: employees = [] } = useFindAll3()

  const activeStays = stays.filter((s) => s.status === 'ACTIVE')

  const checkOutMutation = useCheckOut({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getFindAll6QueryKey() })
        queryClient.invalidateQueries({ queryKey: getFindAll5QueryKey() })
        setSuccess(true)
        setStayId('')
        setEmployeeId('')
      },
    },
  })

  const selectedStay = activeStays.find((s) => getId(s) === stayId)

  const getBookingRoomNumber = (stay: any) => {
    const bookingId = stay?.bookingId
    const id = typeof bookingId === 'object' && bookingId?.$oid ? bookingId.$oid : bookingId
    return id ?? '—'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    checkOutMutation.mutate({
      id: stayId,
      data: { employeeId } as any,
    })
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">Check-out</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Registre a saida de hospedes e finalize a estadia</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Formulario */}
        <div className="bg-white rounded-xl border border-zinc-100 p-6 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
              <LogOut size={18} className="text-zinc-600" />
            </div>
            <div>
              <p className="font-semibold text-zinc-800">Realizar Check-out</p>
              <p className="text-xs text-zinc-400">Selecione a estadia ativa</p>
            </div>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
              Check-out realizado com sucesso!
            </div>
          )}

          {checkOutMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
              Erro ao realizar check-out. Verifique os dados e tente novamente.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Estadia ativa</label>
              <div className="relative">
                <select value={stayId} onChange={(e) => { setStayId(e.target.value); setSuccess(false) }}
                  required className={`${inputClass} appearance-none`}>
                  <option value="">Selecione uma estadia</option>
                  {activeStays.map((s) => (
                    <option key={getId(s)} value={getId(s)}>
                      Estadia — entrada {formatDate(s.checkInAt)}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
              {activeStays.length === 0 && (
                <p className="text-xs text-zinc-400">Nenhuma estadia ativa no momento</p>
              )}
            </div>

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

            <button type="submit" disabled={checkOutMutation.isPending || !stayId || !employeeId}
              className="mt-1 bg-zinc-800 hover:bg-zinc-900 disabled:opacity-50 text-white font-medium text-sm py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              <LogOut size={16} />
              {checkOutMutation.isPending ? 'Processando...' : 'Confirmar Check-out'}
            </button>
          </form>
        </div>

        {/* Resumo da estadia */}
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-zinc-500">Resumo da estadia</p>

          {!selectedStay ? (
            <div className="bg-white rounded-xl border border-dashed border-zinc-200 p-8 flex flex-col items-center justify-center gap-2 text-center">
              <CalendarCheck size={32} className="text-zinc-200" />
              <p className="text-sm text-zinc-400">Selecione uma estadia para ver o resumo</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <BedDouble size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-800">Estadia ativa</p>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Em andamento</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-zinc-50 pt-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-400">Entrada</span>
                    <span className="text-sm font-medium text-zinc-800">{formatDate(selectedStay.checkInAt)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-400">Total de diarias</span>
                    <span className="text-sm font-medium text-zinc-800">R$ {selectedStay.totalDailies?.toFixed(2) ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Consumos */}
              {selectedStay.consumptions && selectedStay.consumptions.length > 0 && (
                <div className="bg-white rounded-xl border border-zinc-100 p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                    <ShoppingBasket size={15} className="text-amber-400" />
                    Consumos
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedStay.consumptions.map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex flex-col">
                          <span className="text-zinc-700">{c.productName}</span>
                          <span className="text-xs text-zinc-400">x{c.quantity} — R$ {c.unitPrice?.toFixed(2)} un.</span>
                        </div>
                        <span className="font-medium text-zinc-800">
                          R$ {((c.quantity ?? 0) * (c.unitPrice ?? 0)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-zinc-50 pt-2 flex justify-between text-sm">
                    <span className="text-zinc-500">Total consumos</span>
                    <span className="font-medium text-zinc-800">R$ {selectedStay.totalConsumptions?.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Total geral */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-700 font-medium">
                  <DollarSign size={16} />
                  Total a pagar
                </div>
                <span className="text-xl font-bold text-amber-700">
                  R$ {selectedStay.grandTotal?.toFixed(2) ?? (
                    ((selectedStay.totalDailies ?? 0) + (selectedStay.totalConsumptions ?? 0)).toFixed(2)
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}