import { useState } from 'react'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { ShoppingBasket, Plus, X, UtensilsCrossed, ChevronDown, Check } from 'lucide-react'
import { useFindAll2 } from '../../services/product-controller/product-controller'
import { customInstance } from '../../lib/axios'
import type { Stay, DeliveryStatus } from '../../services/openAPIDefinition.schemas'

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

const clientStatusOptions = ['FOR_DELIVERY', 'FOR_PICKUP'] as const

function getId(obj: { id?: unknown }): string {
  const id = obj.id as any
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return id.toString()
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

export function Consumos() {
  const queryClient = useQueryClient()
  const [orderStayId, setOrderStayId] = useState<string | null>(null)
  const [orderForm, setOrderForm] = useState({ productId: '', quantity: '1', deliveryStatus: 'FOR_DELIVERY' as DeliveryStatus, notes: '' })

  const myStaysKey = ['my-stays']
  const { data: stays = [], isLoading } = useQuery({
    queryKey: myStaysKey,
    queryFn: () => customInstance<Stay[]>({ url: '/stays/my', method: 'GET' }),
  })

  const activeStays = stays.filter((s) => s.status === 'ACTIVE')
  const { data: products = [] } = useFindAll2()
  const activeProducts = products.filter((p) => p.active)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: myStaysKey })

  const createConsumption = useMutation({
    mutationFn: (params: { stayId: string; data: Record<string, string> }) =>
      customInstance<Stay>({ url: `/stays/${params.stayId}/consumptions`, method: 'POST', data: params.data }),
    onSuccess: () => { invalidate(); setOrderStayId(null); setOrderForm({ productId: '', quantity: '1', deliveryStatus: 'FOR_DELIVERY', notes: '' }) },
  })

  const updateStatus = useMutation({
    mutationFn: (params: { stayId: string; consumptionId: string; deliveryStatus: DeliveryStatus }) =>
      customInstance<Stay>({ url: `/stays/${params.stayId}/consumptions/${params.consumptionId}`, method: 'PUT', data: { deliveryStatus: params.deliveryStatus } }),
    onSuccess: () => invalidate(),
  })

  const handleOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderStayId || !orderForm.productId) return
    createConsumption.mutate({
      stayId: orderStayId,
      data: {
        productId: orderForm.productId,
        quantity: orderForm.quantity,
        deliveryStatus: orderForm.deliveryStatus,
        notes: orderForm.notes,
      },
    })
  }

  const handleCancel = (stayId: string, consumptionId: string) => {
    updateStatus.mutate({ stayId, consumptionId, deliveryStatus: 'CANCELLED' })
  }

  const handleConfirm = (stayId: string, consumptionId: string) => {
    updateStatus.mutate({ stayId, consumptionId, deliveryStatus: 'DELIVERED' })
  }

  const canCancel = (c: any) => c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-800">Consumos</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Peça produtos e servicos para seu quarto</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-zinc-400">Carregando...</div>
      ) : activeStays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-zinc-100">
          <UtensilsCrossed size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhuma estadia ativa</p>
        </div>
      ) : (
        activeStays.map((stay) => {
          const consumptions = stay.consumptions ?? []
          return (
            <div key={getId(stay)} className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 rounded-lg">
                    <ShoppingBasket size={16} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">
                      Estadia #{getId(stay).slice(-6)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Check-in: {stay.checkInAt ? new Date(stay.checkInAt).toLocaleDateString('pt-BR') : '—'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setOrderStayId(getId(stay)); setOrderForm({ productId: '', quantity: '1', deliveryStatus: 'FOR_DELIVERY', notes: '' }) }}
                  className="flex items-center gap-1.5 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Fazer pedido
                </button>
              </div>

              {consumptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-1">
                  <ShoppingBasket size={20} className="text-zinc-200" />
                  <p className="text-zinc-400 text-xs">Nenhum consumo ainda</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {consumptions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className={`text-sm text-zinc-800 truncate ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : ''}`}>{c.productName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs text-zinc-400 ${c.deliveryStatus === 'CANCELLED' ? 'line-through' : ''}`}>x{c.quantity}</span>
                            <span className={`text-xs ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-400'}`}>R$ {((c.unitPrice ?? 0) * (c.quantity ?? 0)).toFixed(2)}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass[c.deliveryStatus ?? ''] ?? ''}`}>
                              {statusLabel[c.deliveryStatus ?? ''] ?? c.deliveryStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canCancel(c) && (
                          <button onClick={() => handleConfirm(getId(stay), c.id ?? '')}
                            disabled={updateStatus.isPending}
                            className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors">
                            <Check size={12} />Confirmar
                          </button>
                        )}
                        {canCancel(c) && (
                          <button onClick={() => handleCancel(getId(stay), c.id ?? '')}
                            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded transition-colors">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Modal fazer pedido */}
      <Modal open={!!orderStayId} title="Fazer pedido" onClose={() => !createConsumption.isPending && setOrderStayId(null)}>
        <form onSubmit={handleOrder} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Produto</label>
            <div className="relative">
              <select
                value={orderForm.productId}
                onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })}
                required
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none"
              >
                <option value="">Selecione</option>
                {activeProducts.map((p) => (
                  <option key={getId(p)} value={getId(p)}>
                    {p.name} — R$ {p.price?.toFixed(2)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Quantidade</label>
            <input
              type="number" min={1} value={orderForm.quantity}
              onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
              required
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tipo de entrega</label>
            <div className="relative">
              <select
                value={orderForm.deliveryStatus}
                onChange={(e) => setOrderForm({ ...orderForm, deliveryStatus: e.target.value as DeliveryStatus })}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none"
              >
                {clientStatusOptions.map((s) => (
                  <option key={s} value={s}>{statusLabel[s]}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Observacao</label>
            <input
              type="text" value={orderForm.notes}
              onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              placeholder="Opcional"
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde placeholder:text-zinc-300"
            />
          </div>

          {createConsumption.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-center">
              Erro ao registrar pedido
            </div>
          )}

          <button
            type="submit" disabled={createConsumption.isPending}
            className="bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors"
          >
            {createConsumption.isPending ? 'Registrando...' : 'Confirmar pedido'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
