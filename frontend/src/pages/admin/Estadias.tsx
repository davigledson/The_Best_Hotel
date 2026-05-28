import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Plus, X, Search, Coffee, ShoppingCart, ChevronDown, Check, XCircle } from 'lucide-react'
import {
  useFindAll6,
  useCheckIn,
  useCheckOut,
  getFindAll6QueryKey,
} from '../../services/stay-controller/stay-controller'
import { useFindAll2 } from '../../services/product-controller/product-controller'
import { customInstance } from '../../lib/axios'
import type { Stay, DeliveryStatus } from '../../services/openAPIDefinition.schemas'

const emptyForm = { bookingId: '' as any, status: 'ACTIVE' as const }

const statusLabel: Record<string, string> = {
  FOR_DELIVERY: 'Para envio',
  FOR_PICKUP: 'Para retirada',
  AWAITING_CONFIRMATION: 'Aguardando confirmacao',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}
const statusClass: Record<string, string> = {
  FOR_DELIVERY: 'bg-blue-100 text-blue-700',
  FOR_PICKUP: 'bg-yellow-100 text-yellow-700',
  AWAITING_CONFIRMATION: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-verde/10 text-verde',
  CANCELLED: 'bg-red-100 text-red-500',
}

interface ModalProps { open: boolean; title: string; onClose: () => void; children: React.ReactNode }
function Modal({ open, title, onClose, children }: ModalProps) { if (!open) return null; return (<div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/40 overflow-y-auto"><div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 my-auto"><div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10"><h2 className="text-base font-semibold text-zinc-800">{title}</h2><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={20} /></button></div><div className="px-6 py-4 max-h-[75vh] overflow-y-auto">{children}</div></div></div>) }

interface FormProps { initial: Stay; onSubmit: (data: any) => void; loading: boolean; submitLabel: string }
function CheckInForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [bookingId, setBookingId] = useState((initial.bookingId as string) ?? '')
  const handle = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ bookingId }) }
  return (<form onSubmit={handle} className="flex flex-col gap-4"><div className="flex flex-col gap-1"><label className="text-xs">Booking ID</label><input value={bookingId} onChange={(e) => setBookingId(e.target.value)} required className="border px-3 py-2 rounded-lg"/></div><button type="submit" disabled={loading} className="mt-2 bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg">{submitLabel}</button></form>)
}

export function Estadias() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalCheckIn, setModalCheckIn] = useState(false)
  const [confirmCheckOut, setConfirmCheckOut] = useState<Stay | null>(null)
  const [consumptionStay, setConsumptionStay] = useState<Stay | null>(null)
  const [consumptionForm, setConsumptionForm] = useState({ productId: '', quantity: '1', deliveryStatus: 'FOR_DELIVERY' as DeliveryStatus, notes: '' })

  const { data: stays = [], isLoading } = useFindAll6()
  const { data: products = [] } = useFindAll2()
  const activeProducts = products.filter((p) => p.active)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll6QueryKey() })
  const checkInMutation = useCheckIn({ mutation: { onSuccess: () => { invalidate(); setModalCheckIn(false) } } })
  const checkOutMutation = useCheckOut({ mutation: { onSuccess: () => { invalidate(); setConfirmCheckOut(null) } } })
  const consumptionMutation = useMutation({
    mutationFn: (params: { stayId: string; data: Record<string, string> }) =>
      customInstance<Stay>({ url: `/stays/${params.stayId}/consumptions`, method: 'POST', data: params.data }),
    onSuccess: () => { invalidate(); setConsumptionStay(null); setConsumptionForm({ productId: '', quantity: '1', deliveryStatus: 'FOR_DELIVERY', notes: '' }) },
  })
  const statusMutation = useMutation({
    mutationFn: (params: { stayId: string; consumptionId: string; deliveryStatus: DeliveryStatus }) =>
      customInstance<Stay>({ url: `/stays/${params.stayId}/consumptions/${params.consumptionId}`, method: 'PUT', data: { deliveryStatus: params.deliveryStatus } }),
    onSuccess: () => invalidate(),
  })

  const filtered = stays.filter((s) => { const q = search.toLowerCase(); return (s.status ?? '').toLowerCase().includes(q) || (s.id as any)?.$oid?.toLowerCase?.()?.includes(q) })
  const getId = (s: Stay) => { const id = s.id as unknown as { $oid?: string } | string; if (typeof id === 'string') return id; if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''; return '' }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold text-zinc-800">Estadias</h1><p className="text-sm text-zinc-400 mt-0.5">Gerencie estadias</p></div><button onClick={() => setModalCheckIn(true)} className="flex items-center gap-2 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg"><Plus size={16}/> Check-in</button></div>

      <div className="relative max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por status ou id..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg"/></div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div> : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-16 gap-2"><Coffee size={32} className="text-zinc-200"/><p className="text-zinc-400 text-sm">Nenhuma estadia encontrada</p></div> : (
          <table className="w-full text-sm"><thead><tr className="border-b bg-zinc-50"><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">ID</th><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Status</th><th className="px-4 py-3"/></tr></thead><tbody>{filtered.map((s) => (<tr key={getId(s)} className="border-b hover:bg-zinc-50"><td className="px-4 py-3 font-medium text-zinc-800">{getId(s)}</td><td className="px-4 py-3 text-zinc-500">{s.status}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-2">{s.status === 'ACTIVE' && <button onClick={() => setConsumptionStay(s)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-amber-600 py-1.5 px-2.5 rounded-lg hover:bg-amber-50 transition-colors"><ShoppingCart size={14}/>Consumos</button>}<button onClick={() => setConfirmCheckOut(s)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg">Check-out</button></div></td></tr>))}</tbody></table>
        )}
      </div>

      <Modal open={modalCheckIn} title="Check-in" onClose={() => setModalCheckIn(false)}>
        <CheckInForm initial={emptyForm} submitLabel="Registrar check-in" loading={checkInMutation.isPending} onSubmit={(data) => checkInMutation.mutate({ data })} />
      </Modal>

      <Modal open={!!confirmCheckOut} title="Check-out" onClose={() => setConfirmCheckOut(null)}>
        {confirmCheckOut && (<div className="flex flex-col gap-4"><p className="text-sm text-zinc-600">Confirmar check-out da estadia <span className="font-medium text-zinc-800">{getId(confirmCheckOut)}</span>?</p><div className="flex gap-2 justify-end"><button onClick={() => setConfirmCheckOut(null)} className="px-4 py-2 text-sm text-zinc-600 border rounded-lg">Cancelar</button><button onClick={() => { const id = getId(confirmCheckOut); checkOutMutation.mutate({ id, data: {} }) }} disabled={checkOutMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg">{checkOutMutation.isPending ? 'Confirmando...' : 'Confirmar'}</button></div></div>)}
      </Modal>

      <Modal open={!!consumptionStay} title="Gerenciar consumos" onClose={() => !consumptionMutation.isPending && !statusMutation.isPending && setConsumptionStay(null)}>
        {consumptionStay && (
          <div className="flex flex-col gap-6">
            {/* Lista de consumos existentes */}
            {consumptionStay.consumptions && consumptionStay.consumptions.length > 0 && (
              <div className="divide-y divide-zinc-50 max-h-64 overflow-y-auto border border-zinc-100 rounded-lg">
                {consumptionStay.consumptions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className={`text-sm ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-800'}`}>{c.productName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-400'}`}>x{c.quantity} — R$ {((c.unitPrice ?? 0) * (c.quantity ?? 0)).toFixed(2)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass[c.deliveryStatus ?? ''] ?? ''}`}>{statusLabel[c.deliveryStatus ?? ''] ?? c.deliveryStatus}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED' && (
                        <button onClick={() => statusMutation.mutate({ stayId: getId(consumptionStay), consumptionId: c.id ?? '', deliveryStatus: 'DELIVERED' })}
                          disabled={statusMutation.isPending}
                          className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors">
                          <Check size={12} />Entregue
                        </button>
                      )}
                      {c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED' && (
                        <button onClick={() => statusMutation.mutate({ stayId: getId(consumptionStay), consumptionId: c.id ?? '', deliveryStatus: 'CANCELLED' })}
                          disabled={statusMutation.isPending}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                          <XCircle size={12} />Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(!consumptionStay.consumptions || consumptionStay.consumptions.length === 0) && (
              <p className="text-sm text-zinc-400 text-center py-4">Nenhum consumo registrado ainda</p>
            )}

            {/* Formulario criar consumo */}
            <div className="border-t border-zinc-100 pt-4">
              <p className="text-sm font-semibold text-zinc-700 mb-4">Novo consumo</p>
              <form onSubmit={(e) => { e.preventDefault(); if (!consumptionForm.productId) return; consumptionMutation.mutate({ stayId: getId(consumptionStay), data: consumptionForm }) }} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Produto</label>
                  <div className="relative">
                    <select value={consumptionForm.productId} onChange={(e) => setConsumptionForm({ ...consumptionForm, productId: e.target.value })} required className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none">
                      <option value="">Selecione</option>
                      {activeProducts.map((p) => (<option key={(p.id as any)?.$oid ?? p.id} value={(p.id as any)?.$oid ?? p.id}>{p.name} — R$ {p.price?.toFixed(2)}</option>))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Quantidade</label>
                  <input type="number" min={1} value={consumptionForm.quantity} onChange={(e) => setConsumptionForm({ ...consumptionForm, quantity: e.target.value })} required className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tipo de entrega</label>
                  <div className="relative">
                    <select value={consumptionForm.deliveryStatus} onChange={(e) => setConsumptionForm({ ...consumptionForm, deliveryStatus: e.target.value as DeliveryStatus })} className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none">
                      <option value="FOR_DELIVERY">Para envio</option>
                      <option value="FOR_PICKUP">Para retirada</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Observacao</label>
                  <input type="text" value={consumptionForm.notes} onChange={(e) => setConsumptionForm({ ...consumptionForm, notes: e.target.value })} placeholder="Opcional" className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde placeholder:text-zinc-300" />
                </div>
                {consumptionMutation.isError && (<div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-center">Erro ao registrar consumo</div>)}
                <button type="submit" disabled={consumptionMutation.isPending} className="bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors">{consumptionMutation.isPending ? 'Registrando...' : 'Registrar consumo'}</button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
