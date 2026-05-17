import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X, Search, Users } from 'lucide-react'
import {
  useFindAll,
  useCreate,
  useUpdate,
  useDelete,
  getFindAllQueryKey,
} from '../services/user-controller/user-controller'
import type { User, UserRole } from '../services/openAPIDefinition.schemas'

const emptyForm: User = { email: '', password: '', role: 'CLIENT', refId: '' }

interface ModalProps { open: boolean; title: string; onClose: () => void; children: React.ReactNode }
function Modal({ open, title, onClose, children }: ModalProps) { if (!open) return null; return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"><div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4"><div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100"><h2 className="text-base font-semibold text-zinc-800">{title}</h2><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={20} /></button></div><div className="px-6 py-4">{children}</div></div></div>) }

interface FormProps { initial: User; onSubmit: (data: User) => void; loading: boolean; submitLabel: string }
function UserForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<User>(initial)
  const set = (field: keyof User) => (e: any) => setForm((p) => ({ ...p, [field]: e.target.value }))
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form) }
  return (<form onSubmit={handleSubmit} className="flex flex-col gap-4"><div className="flex flex-col gap-1"><label className="text-xs">Email</label><input value={form.email ?? ''} onChange={set('email')} required className="border px-3 py-2 rounded-lg"/></div><div className="flex flex-col gap-1"><label className="text-xs">Senha</label><input type="password" value={form.password ?? ''} onChange={set('password')} className="border px-3 py-2 rounded-lg"/></div><div className="flex flex-col gap-1"><label className="text-xs">Role</label><select value={form.role ?? 'CLIENT'} onChange={set('role')} className="border px-3 py-2 rounded-lg"><option>ADMIN</option><option>RECEPTIONIST</option><option>EMPLOYEE</option><option>CLIENT</option></select></div><div className="flex flex-col gap-1"><label className="text-xs">RefId</label><input value={(form.refId as any) ?? ''} onChange={set('refId')} className="border px-3 py-2 rounded-lg"/></div><button type="submit" disabled={loading} className="mt-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg">{submitLabel}</button></form>)
}

export function Usuarios() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)

  const { data: users = [], isLoading } = useFindAll()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAllQueryKey() })
  const createMutation = useCreate({ mutation: { onSuccess: () => { invalidate(); setModalCreate(false) } } })
  const updateMutation = useUpdate({ mutation: { onSuccess: () => { invalidate(); setModalEdit(null) } } })
  const deleteMutation = useDelete({ mutation: { onSuccess: () => { invalidate(); setConfirmDelete(null) } } })

  const filtered = users.filter((u) => { const q = search.toLowerCase(); return u.email?.toLowerCase().includes(q) || (u.role ?? '').toLowerCase().includes(q) })
  const getId = (u: User) => { const id = u.id as unknown as { $oid?: string } | string; if (typeof id === 'string') return id; if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''; return '' }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between"><div><h1 className="text-xl font-semibold text-zinc-800">Usuarios</h1><p className="text-sm text-zinc-400 mt-0.5">Gerencie usuarios</p></div><button onClick={() => setModalCreate(true)} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg"><Plus size={16}/> Novo usuario</button></div>

      <div className="relative max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por email ou role..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg"/></div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {isLoading ? <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div> : filtered.length === 0 ? <div className="flex flex-col items-center justify-center py-16 gap-2"><Users size={32} className="text-zinc-200"/><p className="text-zinc-400 text-sm">Nenhum usuario encontrado</p></div> : (
          <table className="w-full text-sm"><thead><tr className="border-b bg-zinc-50"><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Email</th><th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Role</th><th className="px-4 py-3"/></tr></thead><tbody>{filtered.map((u) => (<tr key={getId(u)} className="border-b hover:bg-zinc-50"><td className="px-4 py-3 font-medium text-zinc-800">{u.email}</td><td className="px-4 py-3 text-zinc-500">{u.role}</td><td className="px-4 py-3"><div className="flex items-center justify-end gap-2"><button onClick={() => setModalEdit(u)} className="p-1.5 text-zinc-400 hover:text-amber-500 rounded-lg" title="Editar"><Pencil size={15}/></button><button onClick={() => setConfirmDelete(u)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg" title="Excluir"><Trash2 size={15}/></button></div></td></tr>))}</tbody></table>
        )}
      </div>

      <Modal open={modalCreate} title="Novo usuario" onClose={() => setModalCreate(false)}>
        <UserForm initial={emptyForm} submitLabel="Cadastrar usuario" loading={createMutation.isPending} onSubmit={(data) => createMutation.mutate({ data })} />
      </Modal>

      <Modal open={!!modalEdit} title="Editar usuario" onClose={() => setModalEdit(null)}>
        {modalEdit && <UserForm initial={modalEdit} submitLabel="Salvar alteracoes" loading={updateMutation.isPending} onSubmit={(data) => updateMutation.mutate({ id: getId(modalEdit), data })} />}
      </Modal>

      <Modal open={!!confirmDelete} title="Excluir usuario" onClose={() => setConfirmDelete(null)}>
        {confirmDelete && (<div className="flex flex-col gap-4"><p className="text-sm text-zinc-600">Tem certeza que deseja excluir o usuario <span className="font-medium text-zinc-800">{confirmDelete.email}</span>? Esta acao nao pode ser desfeita.</p><div className="flex gap-2 justify-end"><button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-zinc-600 border rounded-lg">Cancelar</button><button onClick={() => deleteMutation.mutate({ id: getId(confirmDelete) })} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg">{deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}</button></div></div>)}
      </Modal>
    </div>
  )
}
