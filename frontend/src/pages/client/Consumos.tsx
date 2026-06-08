import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { Search, ShoppingBasket, ChevronDown, Check, X, UtensilsCrossed, Package, ChevronLeft, ChevronRight, Plus, Receipt } from 'lucide-react'
import { useFindAll2 } from '../../services/product-controller/product-controller'
import { customInstance } from '../../lib/axios'
import type { Stay, Consumption, DeliveryStatus } from '../../services/openAPIDefinition.schemas'

const ITEMS_PER_PAGE = 12

function getId(obj: unknown): string {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  if (obj && typeof obj === 'object' && '$oid' in (obj as any)) return (obj as any).$oid
  return String(obj)
}

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

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showSummary, setShowSummary] = useState(false)
  const [orderModal, setOrderModal] = useState<{ productId: string; productName: string; price: number } | null>(null)
  const [orderQty, setOrderQty] = useState('1')
  const [orderDelivery, setOrderDelivery] = useState<DeliveryStatus>('FOR_DELIVERY')
  const [confirmAction, setConfirmAction] = useState<{ stayId: string; consumptionId: string; action: 'DELIVERED' | 'CANCELLED' } | null>(null)

  const myStaysKey = ['my-stays']
  const { data: stays = [], isLoading: staysLoading } = useQuery({
    queryKey: myStaysKey,
    queryFn: () => customInstance<Stay[]>({ url: '/stays/my', method: 'GET' }),
  })

  const activeStay = stays.find((s) => s.status === 'ACTIVE')
  const { data: products = [], isLoading: productsLoading } = useFindAll2()
  const activeProducts = products.filter((p) => p.active)

  const categories = useMemo(() => {
    const cats = new Set(activeProducts.map((p) => p.category).filter(Boolean))
    return Array.from(cats) as string[]
  }, [activeProducts])

  const filteredProducts = useMemo(() => {
    let result = activeProducts
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((p) => p.name?.toLowerCase().includes(q))
    }
    if (categoryFilter) {
      result = result.filter((p) => p.category === categoryFilter)
    }
    return result
  }, [activeProducts, search, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginatedProducts = filteredProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  )

  useEffect(() => { setPage(1) }, [search, categoryFilter])
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])

  const stayId = activeStay ? getId(activeStay.id) : ''
  const consumptions = activeStay?.consumptions ?? []
  const pendingCount = consumptions.filter(
    (c) => c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED'
  ).length
  const totalConsumptions = consumptions
    .reduce((acc, c) => acc + (c.unitPrice ?? 0) * (c.quantity ?? 0), 0)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: myStaysKey })

  const createConsumption = useMutation({
    mutationFn: (params: { stayId: string; data: Record<string, string> }) =>
      customInstance<Stay>({ url: `/stays/${params.stayId}/consumptions`, method: 'POST', data: params.data }),
    onSuccess: () => {
      invalidate()
      setOrderModal(null)
      setOrderQty('1')
      setOrderDelivery('FOR_DELIVERY')
    },
  })

  const updateStatus = useMutation({
    mutationFn: (params: { stayId: string; consumptionId: string; deliveryStatus: DeliveryStatus }) =>
      customInstance<Stay>({
        url: `/stays/${params.stayId}/consumptions/${params.consumptionId}`,
        method: 'PUT',
        data: { deliveryStatus: params.deliveryStatus },
      }),
    onSuccess: () => { invalidate(); setConfirmAction(null) },
  })

  const handleOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!stayId || !orderModal) return
    createConsumption.mutate({
      stayId,
      data: {
        productId: orderModal.productId,
        quantity: orderQty,
        deliveryStatus: orderDelivery,
      },
    })
  }

  const canAct = (c: Consumption) =>
    c.deliveryStatus !== 'DELIVERED' && c.deliveryStatus !== 'CANCELLED' && !!c.id

  const isLoading = staysLoading || productsLoading

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Carregando...</div>
  }

  if (!activeStay) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Consumos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Peca produtos e servicos para seu quarto</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-zinc-100">
          <UtensilsCrossed size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhuma estadia ativa</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Lojinha do hotel</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Peca produtos e servicos para seu quarto</p>
        </div>
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="relative flex items-center gap-2 bg-white border border-zinc-200 hover:border-amber-300 text-zinc-700 font-medium text-sm px-4 py-2 rounded-xl transition-colors"
        >
          <Receipt size={16} />
          Resumo
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-zinc-900 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full border border-zinc-200 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde placeholder:text-zinc-300"
          />
        </div>
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-zinc-200 rounded-lg px-3 py-2 pr-8 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none"
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
        {filteredProducts.length > 0 && (
          <span className="text-xs text-zinc-400">
            {filteredProducts.length} produto(s)
          </span>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-zinc-100">
          <Package size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">
            {search || categoryFilter ? 'Nenhum produto encontrado' : 'Nenhum produto disponivel'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {paginatedProducts.map((product) => {
              const pid = getId(product.id)
              return (
                <div key={pid} className="bg-white rounded-xl border border-zinc-100 p-4 flex flex-col gap-2 hover:border-amber-200 hover:shadow-sm transition-all group">
                  <div className="p-2 bg-zinc-100 group-hover:bg-amber-50 rounded-lg w-fit transition-colors">
                    <Package size={18} className="text-zinc-500 group-hover:text-amber-500 transition-colors" />
                  </div>
                  <div className="min-h-0">
                    <p className="text-sm font-medium text-zinc-800 truncate" title={product.name}>{product.name}</p>
                    {product.category && (
                      <span className="inline-block text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded mt-0.5">
                        {product.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span className="text-sm font-bold text-zinc-800">R$ {product.price?.toFixed(2)}</span>
                    <button
                      onClick={() => {
                        setOrderModal({ productId: pid, productName: product.name ?? '', price: product.price ?? 0 })
                        setOrderQty('1')
                        setOrderDelivery('FOR_DELIVERY')
                      }}
                      className="flex items-center gap-1 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={12} />
                      Pedir
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                onClick={() => setPage(safePage - 1)}
                disabled={safePage <= 1}
                className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
              ))}
              <button
                onClick={() => setPage(safePage + 1)}
                disabled={safePage >= totalPages}
                className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Mini summary toggle */}
      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShoppingBasket size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-700">Meus consumos</h2>
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                {pendingCount} pendente(s)
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">
              {consumptions.length} item(ns) &middot; R$ {totalConsumptions.toFixed(2)}
            </span>
            <ChevronDown
              size={16}
              className={`text-zinc-400 transition-transform ${showSummary ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {showSummary && (
          <div className="border-t border-zinc-50">
            {consumptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-1">
                <ShoppingBasket size={20} className="text-zinc-200" />
                <p className="text-zinc-400 text-xs">Nenhum consumo ainda</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {consumptions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm text-zinc-800 truncate ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : ''}`}>
                          {c.productName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-zinc-400">x{c.quantity}</span>
                          <span className={`text-xs ${c.deliveryStatus === 'CANCELLED' ? 'line-through text-zinc-300' : 'text-zinc-500'}`}>
                            R$ {((c.unitPrice ?? 0) * (c.quantity ?? 0)).toFixed(2)}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass[c.deliveryStatus ?? ''] ?? ''}`}>
                            {statusLabel[c.deliveryStatus ?? ''] ?? c.deliveryStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canAct(c) && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => setConfirmAction({ stayId, consumptionId: c.id!, action: 'DELIVERED' })}
                          disabled={updateStatus.isPending}
                          className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 px-2 py-1 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          <Check size={12} />
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmAction({ stayId, consumptionId: c.id!, action: 'CANCELLED' })}
                          className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X size={12} />
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {consumptions.length > 0 && (
                  <div className="flex items-center justify-between px-5 py-3 bg-zinc-50">
                    <span className="text-sm font-semibold text-zinc-700">Total</span>
                    <span className="text-sm font-bold text-zinc-800">R$ {totalConsumptions.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Order modal */}
      <Modal open={!!orderModal} title="Fazer pedido" onClose={() => !createConsumption.isPending && setOrderModal(null)}>
        {orderModal && (
          <form onSubmit={handleOrder} className="flex flex-col gap-4">
            <div className="bg-zinc-50 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-zinc-800">{orderModal.productName}</p>
              <p className="text-xs text-zinc-400">R$ {orderModal.price.toFixed(2)} por unidade</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Quantidade</label>
              <input
                type="number" min={1} max={99} value={orderQty}
                onChange={(e) => setOrderQty(e.target.value)}
                required
                className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Tipo de entrega</label>
              <div className="relative">
                <select
                  value={orderDelivery}
                  onChange={(e) => setOrderDelivery(e.target.value as DeliveryStatus)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 pr-8 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none"
                >
                  {['FOR_DELIVERY', 'FOR_PICKUP'].map((s) => (
                    <option key={s} value={s}>{statusLabel[s]}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-amber-700">Total estimado</span>
              <span className="text-base font-bold text-amber-700">
                R$ {(orderModal.price * (parseInt(orderQty) || 1)).toFixed(2)}
              </span>
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
        )}
      </Modal>

      {/* Confirm action modal */}
      <Modal open={!!confirmAction} title={confirmAction?.action === 'DELIVERED' ? 'Confirmar recebimento' : 'Cancelar pedido'} onClose={() => setConfirmAction(null)}>
        {confirmAction && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              {confirmAction.action === 'DELIVERED'
                ? 'Confirmar que recebeu este item?'
                : 'Tem certeza que deseja cancelar este pedido?'}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmAction(null)} disabled={updateStatus.isPending}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Voltar
              </button>
              <button
                onClick={() => updateStatus.mutate({ stayId: confirmAction.stayId, consumptionId: confirmAction.consumptionId, deliveryStatus: confirmAction.action })}
                disabled={updateStatus.isPending}
                className={`px-4 py-2 text-sm font-medium text-white disabled:opacity-50 rounded-lg transition-colors ${confirmAction.action === 'DELIVERED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {updateStatus.isPending ? 'Confirmando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
