import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X, Search, ShieldCheck, ChevronDown, Eye, EyeOff } from 'lucide-react'
import {
  useFindAll,
  useCreate,
  useUpdate,
  useDelete,
  getFindAllQueryKey,
} from '../../services/user-controller/user-controller'
import type { User, UserRole } from '../../services/openAPIDefinition.schemas'

const emptyForm: User = { email: '', password: '', role: 'CLIENT', refId: '' as any }

const roleConfig: Record<string, { label: string; color: string }> = {
  ADMIN:        { label: 'Admin',        color: 'bg-red-100 text-red-700' },
  RECEPTIONIST: { label: 'Recepcionista', color: 'bg-blue-100 text-blue-700' },
  EMPLOYEE:     { label: 'Funcionario',  color: 'bg-yellow-100 text-yellow-700' },
  CLIENT:       { label: 'Cliente',      color: 'bg-green-100 text-green-700' },
}

function getId(u: User): string {
  const id = u.id as any
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return id.toString()
}

function getInitials(email?: string) {
  if (!email) return '?'
  return email[0].toUpperCase()
}

const inputClass = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-zinc-300"
const labelClass = "text-xs font-medium text-zinc-500 uppercase tracking-wide"

interface ModalProps { open: boolean; title: string; onClose: () => void; children: React.ReactNode }
function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-800">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

interface FormProps { initial: User; onSubmit: (data: User) => void; loading: boolean; submitLabel: string }
function UserForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<User>(initial)
  const [showPassword, setShowPassword] = useState(false)

  const set = (field: keyof User) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form) }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Email</label>
        <input type="email" value={form.email ?? ''} onChange={set('email')} required
          placeholder="email@exemplo.com" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Senha</label>
        <div className="relative">
          <input type={showPassword ? 'text' : 'password'} value={form.password ?? ''} onChange={set('password')}
            placeholder="••••••••" className={`${inputClass} pr-10`} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Perfil de acesso</label>
        <div className="relative">
          <select value={form.role ?? 'CLIENT'} onChange={set('role')} className={`${inputClass} appearance-none`}>
            <option value="ADMIN">Admin</option>
            <option value="RECEPTIONIST">Recepcionista</option>
            <option value="EMPLOYEE">Funcionario</option>
            <option value="CLIENT">Cliente</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      <button type="submit" disabled={loading}
        className="mt-1 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors">
        {loading ? 'Salvando...' : submitLabel}
      </button>
    </form>
  )
}

export function Usuarios() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)

  const { data: users = [], isLoading } = useFindAll()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAllQueryKey() })

  const createMutation = useCreate({ mutation: { onSuccess: () => { invalidate(); setModalCreate(false) } } })
  const updateMutation = useUpdate({ mutation: { onSuccess: () => { invalidate(); setModalEdit(null) } } })
  const deleteMutation = useDelete({ mutation: { onSuccess: () => { invalidate(); setConfirmDelete(null) } } })

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    const matchSearch = u.email?.toLowerCase().includes(q) || (u.role ?? '').toLowerCase().includes(q)
    const matchRole = roleFilter ? u.role === roleFilter : true
    return matchSearch && matchRole
  })

  const counts = Object.keys(roleConfig).reduce((acc, key) => {
    acc[key] = users.filter((u) => u.role === key).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Usuarios</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie os acessos ao sistema</p>
        </div>
        <button onClick={() => setModalCreate(true)}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors">
          <Plus size={16} /> Novo usuario
        </button>
      </div>

      {/* Cards por role */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(roleConfig).map(([key, { label, color }]) => (
          <button key={key} onClick={() => setRoleFilter(roleFilter === key ? '' : key as UserRole)}
            className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${roleFilter === key ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${color}`}>{label}</span>
            <span className="text-2xl font-semibold text-zinc-800">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email ou perfil..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-zinc-300" />
      </div>

      {/* Cards de usuarios */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <ShieldCheck size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhum usuario encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((user) => {
            const role = roleConfig[user.role ?? ''] ?? { label: user.role, color: 'bg-zinc-100 text-zinc-500' }
            return (
              <div key={getId(user)} className="bg-white rounded-xl border border-zinc-100 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-semibold text-sm shrink-0">
                    {getInitials(user.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-800 truncate">{user.email}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block ${role.color}`}>
                      {role.label}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 border-t border-zinc-50 pt-3">
                  <button onClick={() => setModalEdit(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-amber-500 hover:border-amber-200 transition-colors">
                    <Pencil size={13} /> Editar
                  </button>
                  <button onClick={() => setConfirmDelete(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar */}
      <Modal open={modalCreate} title="Novo usuario" onClose={() => setModalCreate(false)}>
        <UserForm initial={emptyForm} submitLabel="Cadastrar usuario" loading={createMutation.isPending}
          onSubmit={(data) => createMutation.mutate({ data })} />
      </Modal>

      {/* Modal editar */}
      <Modal open={!!modalEdit} title="Editar usuario" onClose={() => setModalEdit(null)}>
        {modalEdit && (
          <UserForm initial={modalEdit} submitLabel="Salvar alteracoes" loading={updateMutation.isPending}
            onSubmit={(data) => updateMutation.mutate({ id: getId(modalEdit), data })} />
        )}
      </Modal>

      {/* Modal confirmar exclusao */}
      <Modal open={!!confirmDelete} title="Excluir usuario" onClose={() => setConfirmDelete(null)}>
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Tem certeza que deseja excluir o usuario{' '}
              <span className="font-medium text-zinc-800">{confirmDelete.email}</span>? Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => deleteMutation.mutate({ id: getId(confirmDelete) })}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors">
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}