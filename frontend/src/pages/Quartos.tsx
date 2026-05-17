import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X, Search, Home } from 'lucide-react'
import {
  useFindAll1,
  useCreate1,
  useUpdate1,
  useDelete1,
  getFindAll1QueryKey,
} from '../services/room-controller/room-controller'
import type { Room } from '../services/openAPIDefinition.schemas'

const emptyForm: Room = { number: '', type: '', description: '', capacity: 1, dailyRate: 0, status: 'AVAILABLE' }

interface ModalProps { open: boolean; title: string; onClose: () => void; children: React.ReactNode }
function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-800">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

interface FormProps { initial: Room; onSubmit: (data: Room) => void; loading: boolean; submitLabel: string }
function RoomForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<Room>(initial)
  const set = (field: keyof Room) => (e: any) => setForm((prev) => ({ ...prev, [field]: field === 'capacity' || field === 'dailyRate' ? Number(e.target.value) : e.target.value }))

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form) }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1"><label className="text-xs">Numero</label><input value={form.number ?? ''} onChange={set('number')} required className="border px-3 py-2 rounded-lg" /></div>
      <div className="flex flex-col gap-1"><label className="text-xs">Tipo</label><input value={form.type ?? ''} onChange={set('type')} className="border px-3 py-2 rounded-lg" /></div>
      <div className="flex flex-col gap-1"><label className="text-xs">Descricao</label><input value={form.description ?? ''} onChange={set('description')} className="border px-3 py-2 rounded-lg" /></div>
      <div className="flex gap-2">
        <div className="flex-1 flex flex-col gap-1"><label className="text-xs">Capacidade</label><input type="number" value={form.capacity ?? 1} onChange={set('capacity')} className="border px-3 py-2 rounded-lg" /></div>
        <div className="flex-1 flex flex-col gap-1"><label className="text-xs">Diária</label><input type="number" value={form.dailyRate ?? 0} onChange={set('dailyRate')} className="border px-3 py-2 rounded-lg" /></div>
      </div>
      <div className="flex gap-2"><label className="text-xs">Status</label>
        <select value={form.status ?? 'AVAILABLE'} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="border px-3 py-2 rounded-lg">
          <option value="AVAILABLE">AVAILABLE</option>
          <option value="OCCUPIED">OCCUPIED</option>
          <option value="MAINTENANCE">MAINTENANCE</option>
        </select>
      </div>
      <button type="submit" disabled={loading} className="mt-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg">{loading ? 'Salvando...' : submitLabel}</button>
    </form>
  )
}

export function Quartos() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState<Room | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Room | null>(null)

  const { data: rooms = [], isLoading } = useFindAll1()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll1QueryKey() })
  const createMutation = useCreate1({ mutation: { onSuccess: () => { invalidate(); setModalCreate(false) } } })
  const updateMutation = useUpdate1({ mutation: { onSuccess: () => { invalidate(); setModalEdit(null) } } })
  const deleteMutation = useDelete1({ mutation: { onSuccess: () => { invalidate(); setConfirmDelete(null) } } })

  const filtered = rooms.filter((r) => { const q = search.toLowerCase(); return r.number?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q) })

  const getId = (r: Room) => { const id = r.id as unknown as { $oid?: string } | string; if (typeof id === 'string') return id; if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''; return '' }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Quartos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie os quartos</p>
        </div>
        <button onClick={() => setModalCreate(true)} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg"><Plus size={16}/> Novo quarto</button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por numero ou tipo..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg" />
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2"><Home size={32} className="text-zinc-200" /><p className="text-zinc-400 text-sm">Nenhum quarto encontrado</p></div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="border-b bg-zinc-50"><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Numero</th><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Tipo</th><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Status</th><th className="px-4 py-3"/></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={getId(r)} className="border-b hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-800">{r.number}</td>
                  <td className="px-4 py-3 text-zinc-500">{r.type}</td>
                  <td className="px-4 py-3 text-zinc-500">{r.status}</td>
                  <td className="px-4 py-3"><div className="flex items-center justify-end gap-2"><button onClick={() => setModalEdit(r)} className="p-1.5 text-zinc-400 hover:text-amber-500 rounded-lg" title="Editar"><Pencil size={15}/></button><button onClick={() => setConfirmDelete(r)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg" title="Excluir"><Trash2 size={15}/></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalCreate} title="Novo quarto" onClose={() => setModalCreate(false)}>
        <RoomForm initial={emptyForm} submitLabel="Cadastrar quarto" loading={createMutation.isPending} onSubmit={(data) => createMutation.mutate({ data })} />
      </Modal>

      <Modal open={!!modalEdit} title="Editar quarto" onClose={() => setModalEdit(null)}>
        {modalEdit && <RoomForm initial={modalEdit} submitLabel="Salvar alteracoes" loading={updateMutation.isPending} onSubmit={(data) => updateMutation.mutate({ id: getId(modalEdit), data })} />}
      </Modal>

      <Modal open={!!confirmDelete} title="Excluir quarto" onClose={() => setConfirmDelete(null)}>
        {confirmDelete && (<div className="flex flex-col gap-4"><p className="text-sm text-zinc-600">Tem certeza que deseja excluir o quarto <span className="font-medium text-zinc-800">{confirmDelete.number}</span>? Esta acao nao pode ser desfeita.</p><div className="flex gap-2 justify-end"><button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-zinc-600 border rounded-lg">Cancelar</button><button onClick={() => deleteMutation.mutate({ id: getId(confirmDelete) })} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg">{deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}</button></div></div>)}
      </Modal>
    </div>
  )
}
