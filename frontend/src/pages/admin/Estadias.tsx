import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, X, Search, Coffee } from 'lucide-react'
import {
  useFindAll6,
  useCheckIn,
  useCheckOut,
  getFindAll6QueryKey,
} from '../../services/stay-controller/stay-controller'
import type { Stay } from '../../services/openAPIDefinition.schemas'

const emptyForm: Stay = { bookingId: '', status: 'ACTIVE' }

interface ModalProps { open: boolean; title: string; onClose: () => void; children: React.ReactNode }
function Modal({ open, title, onClose, children }: ModalProps) { if (!open) return null; return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4"><div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100"><h2 className="text-base font-semibold text-zinc-800">{title}</h2><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={20} /></button></div><div className="px-6 py-4">{children}</div></div></div>) }

interface FormProps { initial: Stay; onSubmit: (data: any) => void; loading: boolean; submitLabel: string }
function CheckInForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [bookingId, setBookingId] = useState(initial.bookingId ?? '')
  const handle = (e: React.FormEvent) => { e.preventDefault(); onSubmit({ bookingId }) }
  return (<form onSubmit={handle} className="flex flex-col gap-4"><div className="flex flex-col gap-1"><label className="text-xs">Booking ID</label><input value={bookingId} onChange={(e) => setBookingId(e.target.value)} required className="border px-3 py-2 rounded-lg"/></div><button type="submit" disabled={loading} className="mt-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg">{submitLabel}</button></form>)
}

export function Estadias() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalCheckIn, setModalCheckIn] = useState(false)
  const [confirmCheckOut, setConfirmCheckOut] = useState<Stay | null>(null)

  const { data: stays = [], isLoading } = useFindAll6()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll6QueryKey() })
  const checkInMutation = useCheckIn({ mutation: { onSuccess: () => { invalidate(); setModalCheckIn(false) } } })
  const checkOutMutation = useCheckOut({ mutation: { onSuccess: () => { invalidate(); setConfirmCheckOut(null) } } })

  const filtered = stays.filter((s) => { const q = search.toLowerCase(); return (s.status ?? '').toLowerCase().includes(q) || (s.id as any)?.$oid?.toLowerCase?.()?.includes(q) })
  const getId = (s: Stay) => { const id = s.id as unknown as { $oid?: string } | string; if (typeof id === 'string') return id; if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''; return '' }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold text-zinc-800">Estadias</h1><p className="text-sm text-zinc-400 mt-0.5">Gerencie estadias</p></div><button onClick={() => setModalCheckIn(true)} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg"><Plus size={16}/> Check-in</button></div>

      <div className="relative max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por status ou id..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg"/></div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div> : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-16 gap-2"><Coffee size={32} className="text-zinc-200"/><p className="text-zinc-400 text-sm">Nenhuma estadia encontrada</p></div> : (
          <table className="w-full text-sm"><thead><tr className="border-b bg-zinc-50"><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">ID</th><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Status</th><th className="px-4 py-3"/></tr></thead><tbody>{filtered.map((s) => (<tr key={getId(s)} className="border-b hover:bg-zinc-50"><td className="px-4 py-3 font-medium text-zinc-800">{getId(s)}</td><td className="px-4 py-3 text-zinc-500">{s.status}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-2"><button onClick={() => setConfirmCheckOut(s)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg">Check-out</button></div></td></tr>))}</tbody></table>
        )}
      </div>

      <Modal open={modalCheckIn} title="Check-in" onClose={() => setModalCheckIn(false)}>
        <CheckInForm initial={emptyForm} submitLabel="Registrar check-in" loading={checkInMutation.isPending} onSubmit={(data) => checkInMutation.mutate({ data })} />
      </Modal>

      <Modal open={!!confirmCheckOut} title="Check-out" onClose={() => setConfirmCheckOut(null)}>
        {confirmCheckOut && (<div className="flex flex-col gap-4"><p className="text-sm text-zinc-600">Confirmar check-out da estadia <span className="font-medium text-zinc-800">{getId(confirmCheckOut)}</span>?</p><div className="flex gap-2 justify-end"><button onClick={() => setConfirmCheckOut(null)} className="px-4 py-2 text-sm text-zinc-600 border rounded-lg">Cancelar</button><button onClick={() => { const id = getId(confirmCheckOut); checkOutMutation.mutate({ id, data: {} }) }} disabled={checkOutMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg">{checkOutMutation.isPending ? 'Confirmando...' : 'Confirmar'}</button></div></div>)}
      </Modal>
    </div>
  )
}
