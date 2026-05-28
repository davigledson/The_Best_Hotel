import { useFindByStatus } from '../../services/stay-controller/stay-controller'
import { BedDouble, ShoppingBasket, Receipt } from 'lucide-react'
import type { Stay } from '../../services/openAPIDefinition.schemas'

function getId(id: unknown): string {
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id && typeof id === 'object' && '$oid' in (id as any)) return (id as any).$oid
  return id.toString()
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

export function MyStay() {
  const { data: stays = [], isLoading } = useFindByStatus('ACTIVE')
  const stay: Stay | undefined = stays[0]

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Carregando...</div>
  }

  if (!stay) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Minha estadia</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Acompanhe sua estadia e consumos</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 gap-2 bg-white rounded-xl border border-zinc-100">
          <BedDouble size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhuma estadia ativa no momento</p>
        </div>
      </div>
    )
  }

  const consumptions = stay.consumptions ?? []
  const totalConsumptions = consumptions
    .filter((c) => c.deliveryStatus === 'DELIVERED')
    .reduce((acc, c) => acc + (c.unitPrice ?? 0) * (c.quantity ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Minha estadia</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Acompanhe sua estadia e consumos</p>
        </div>
        <span className="text-xs bg-verde/10 text-verde font-medium px-3 py-1 rounded-full">Ativa</span>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 px-5 py-4 flex items-center gap-4">
        <div className="p-2 bg-zinc-100 rounded-lg">
          <BedDouble size={20} className="text-zinc-500" />
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-zinc-400">Check-in</p>
            <p className="font-medium text-zinc-800">
              {stay.checkInAt ? new Date(stay.checkInAt).toLocaleDateString('pt-BR') : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Quarto</p>
            <p className="font-medium text-zinc-800">{getId(stay.bookingId)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-50">
          <ShoppingBasket size={16} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">Consumos</h2>
        </div>

        {consumptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-1">
            <ShoppingBasket size={24} className="text-zinc-200" />
            <p className="text-zinc-400 text-sm">Nenhum consumo registrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Produto</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Qtd</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Unit.</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Subtotal</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {consumptions.map((c, i) => (
                <tr key={i} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3 text-zinc-800">{c.productName}</td>
                  <td className="px-4 py-3 text-center text-zinc-500">{c.quantity}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">R$ {c.unitPrice?.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${c.deliveryStatus === 'CANCELLED' ? 'text-zinc-300 line-through' : 'text-zinc-700'}`}>
                    R$ {((c.unitPrice ?? 0) * (c.quantity ?? 0)).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass[c.deliveryStatus ?? ''] ?? ''}`}>
                      {statusLabel[c.deliveryStatus ?? ''] ?? c.deliveryStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Receipt size={16} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-700">Resumo parcial</h2>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-zinc-500">
            <span>Total em consumos (entregues)</span>
            <span className="font-medium text-zinc-800">R$ {totalConsumptions.toFixed(2)}</span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            As diarias serao calculadas e cobradas no momento do check-out.
          </p>
        </div>
      </div>
    </div>
  )
}
