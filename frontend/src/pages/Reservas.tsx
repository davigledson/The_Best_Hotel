import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, X, Search, Calendar } from 'lucide-react'
// useCancel hook from generated service will be used for cancel mutation
import {
  useFindAll5,
  useCreate5,
  getFindAll5QueryKey,
  useCancel,
  cancel,
} from '../services/booking-controller/booking-controller'
import type { Booking } from '../services/openAPIDefinition.schemas'

const emptyForm: Booking = { roomId: '', checkInDate: '', checkOutDate: '', dailyRate: 0, advancePayment: 0 }

interface ModalProps { open: boolean; title: string; onClose: () => void; children: React.ReactNode }
function Modal({ open, title, onClose, children }: ModalProps) { if (!open) return null; return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4"><div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100"><h2 className="text-base font-semibold text-zinc-800">{title}</h2><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={20} /></button></div><div className="px-6 py-4">{children}</div></div></div>) }

interface FormProps { initial: Booking; onSubmit: (data: Booking) => void; loading: boolean; submitLabel: string }
function BookingForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<Booking>(initial)
  const set = (field: keyof Booking) => (e: any) => setForm((p) => ({ ...p, [field]: field === 'dailyRate' || field === 'advancePayment' ? Number(e.target.value) : e.target.value }))
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form) }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs">ID do quarto</label><input value={form.roomId ?? ''} onChange={set('roomId')} required className="border px-3 py-2 rounded-lg"/></div>
      <div className="flex gap-2"><div className="flex-1"><label className="text-xs">Check-in</label><input type="date" value={form.checkInDate ?? ''} onChange={set('checkInDate')} className="border px-3 py-2 rounded-lg"/></div><div className="flex-1"><label className="text-xs">Check-out</label><input type="date" value={form.checkOutDate ?? ''} onChange={set('checkOutDate')} className="border px-3 py-2 rounded-lg"/></div></div>
      <div className="flex gap-2"><div className="flex-1"><label className="text-xs">Diária</label><input type="number" value={form.dailyRate ?? 0} onChange={set('dailyRate')} className="border px-3 py-2 rounded-lg"/></div><div className="flex-1"><label className="text-xs">Adiantamento</label><input type="number" value={form.advancePayment ?? 0} onChange={set('advancePayment')} className="border px-3 py-2 rounded-lg"/></div></div>
      <button type="submit" disabled={loading} className="mt-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg">{loading ? 'Salvando...' : submitLabel}</button>
    </form>
  )
}

export function Reservas() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalCreate, setModalCreate] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState<Booking | null>(null)

  const { data: bookings = [], isLoading } = useFindAll5()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll5QueryKey() })
  const createMutation = useCreate5({ mutation: { onSuccess: () => { invalidate(); setModalCreate(false) } } })
  const cancelMutation = useCancel({ mutation: { onSuccess: () => { invalidate(); setConfirmCancel(null) } } })

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase()
    return b.roomId?.toString().toLowerCase().includes(q) || (b.status ?? '').toLowerCase().includes(q)
  })

  const getId = (b: Booking) => { const id = b.id as unknown as { $oid?: string } | string; if (typeof id === 'string') return id; if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''; return '' }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold text-zinc-800">Reservas</h1><p className="text-sm text-zinc-400 mt-0.5">Gerencie as reservas</p></div><button onClick={() => setModalCreate(true)} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg"><Plus size={16}/> Nova reserva</button></div>

      <div className="relative max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por quarto ou status..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg" /></div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div> : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-16 gap-2"><Calendar size={32} className="text-zinc-200"/><p className="text-zinc-400 text-sm">Nenhuma reserva encontrada</p></div> : (
          <table className="w-full text-sm"><thead><tr className="border-b bg-zinc-50"><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Quarto</th><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Check-in</th><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Check-out</th><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Status</th><th className="px-4 py-3"/></tr></thead>
            <tbody>{filtered.map((b) => (<tr key={getId(b)} className="border-b hover:bg-zinc-50"><td className="px-4 py-3 font-medium text-zinc-800">{b.roomId as any}</td><td className="px-4 py-3 text-zinc-500">{b.checkInDate}</td><td className="px-4 py-3 text-zinc-500">{b.checkOutDate}</td><td className="px-4 py-3 text-zinc-500">{b.status}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-2"><button onClick={() => setConfirmCancel(b)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg">Cancelar</button></div></td></tr>))}</tbody>
          </table>
        )}
      </div>

      <Modal open={modalCreate} title="Nova reserva" onClose={() => setModalCreate(false)}>
        <BookingForm initial={emptyForm} submitLabel="Cadastrar reserva" loading={createMutation.isPending} onSubmit={(data) => createMutation.mutate({ data })} />
      </Modal>

      <Modal open={!!confirmCancel} title="Cancelar reserva" onClose={() => setConfirmCancel(null)}>
        {confirmCancel && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">Tem certeza que deseja cancelar a reserva do quarto <span className="font-medium text-zinc-800">{confirmCancel.roomId as any}</span>?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmCancel(null)} className="px-4 py-2 text-sm text-zinc-600 border rounded-lg">Cancelar</button>
              <button onClick={() => { const id = getId(confirmCancel); cancelMutation.mutate({ id, data: {} }) }} disabled={cancelMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg">{cancelMutation.isPending ? 'Cancelando...' : 'Confirmar'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
