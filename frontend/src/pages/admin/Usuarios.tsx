import { useState } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X, ShieldCheck, ChevronDown, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useFindAll,
  useUpdate,
  useDelete,
  getFindAllQueryKey,
} from '../../services/user-controller/user-controller'
import { getFindAll3QueryKey } from '../../services/employee-controller/employee-controller'
import { getFindAll4QueryKey } from '../../services/client-controller/client-controller'
import { customInstance } from '../../lib/axios'
import type { User, UserRole } from '../../services/openAPIDefinition.schemas'
import { FilterButton, FilterPanel } from '../../components/FilterPanel'

const PAGE_SIZE = 20

interface UserCreatePayload {
  email: string
  password: string
  role: UserRole
  employeeName?: string
  employeeCpf?: string
  employeePhone?: string
  clientName?: string
  clientCpf?: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
}

const emptyForm: UserCreatePayload = { email: '', password: '', role: 'CLIENT' }

const roleConfig: Record<string, { label: string; color: string }> = {
  ADMIN:    { label: 'Admin',       color: 'bg-red-100 text-red-700' },
  EMPLOYEE: { label: 'Funcionario', color: 'bg-yellow-100 text-yellow-700' },
  CLIENT:   { label: 'Cliente',     color: 'bg-verde/10 text-verde' },
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

const inputClass = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent placeholder:text-zinc-300"
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

function formatCPF(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .slice(0, 14)
}

function formatPhone(value: string) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2')
    .slice(0, 15)
}

interface FormProps { initial: UserCreatePayload; onSubmit: (data: UserCreatePayload) => void; loading: boolean; submitLabel: string }
function UserForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<UserCreatePayload>(initial)
  const [showPassword, setShowPassword] = useState(false)

  const set = (field: keyof UserCreatePayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value
    if (field === 'employeeCpf' || field === 'clientCpf') value = formatCPF(value)
    if (field === 'employeePhone' || field === 'clientPhone') value = formatPhone(value)
    setForm((p) => ({ ...p, [field]: value }))
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
            <option value="EMPLOYEE">Funcionario</option>
            <option value="CLIENT">Cliente</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>
      </div>

      {form.role === 'EMPLOYEE' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nome completo</label>
            <input type="text" value={form.employeeName ?? ''} onChange={set('employeeName')} required
              placeholder="Nome do funcionario" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>CPF</label>
            <input type="text" value={form.employeeCpf ?? ''} onChange={set('employeeCpf')} required
              placeholder="000.000.000-00" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Telefone</label>
            <input type="text" value={form.employeePhone ?? ''} onChange={set('employeePhone')}
              placeholder="(00) 00000-0000" className={inputClass} />
          </div>
        </>
      )}

      {form.role === 'CLIENT' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nome completo</label>
            <input type="text" value={form.clientName ?? ''} onChange={set('clientName')} required
              placeholder="Nome do cliente" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>CPF</label>
            <input type="text" value={form.clientCpf ?? ''} onChange={set('clientCpf')} required
              placeholder="000.000.000-00" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Telefone</label>
            <input type="text" value={form.clientPhone ?? ''} onChange={set('clientPhone')}
              placeholder="(00) 00000-0000" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Endereco</label>
            <input type="text" value={form.clientAddress ?? ''} onChange={set('clientAddress')}
              placeholder="Rua, numero, cidade" className={inputClass} />
          </div>
        </>
      )}

      <button type="submit" disabled={loading}
        className="mt-1 bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors">
        {loading ? 'Salvando...' : submitLabel}
      </button>
    </form>
  )
}

export function Usuarios() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('')
  const [page, setPage] = useState(0)
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState<User | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null)
  const [error, setError] = useState('')

  const { data: users = [], isLoading } = useFindAll()
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getFindAllQueryKey() })
    queryClient.invalidateQueries({ queryKey: getFindAll3QueryKey() })
    queryClient.invalidateQueries({ queryKey: getFindAll4QueryKey() })
  }

  const createMutation = useMutation({
    mutationFn: (data: UserCreatePayload) => customInstance<User>({ url: '/users', method: 'POST', data }),
    onSuccess: () => { invalidate(); setModalCreate(false); setError('') },
    onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao criar usuário'),
  })

  const updateMutation = useUpdate({ mutation: {
    onSuccess: () => { invalidate(); setModalEdit(null); setError('') },
    onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao atualizar usuário'),
  } })
  const deleteMutation = useDelete({ mutation: {
    onSuccess: () => { invalidate(); setConfirmDelete(null); setError('') },
    onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao excluir usuário'),
  } })

  const filtered = users.filter((u) => {
    const matchRole = roleFilter ? u.role === roleFilter : true
    if (!matchRole) return false
    if (filters.email && !(u.email ?? '').toLowerCase().includes(filters.email.toLowerCase())) return false
    if (filters.role && u.role !== filters.role) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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
          className="flex items-center gap-2 bg-amber-400 hover:bg-laranja text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors">
          <Plus size={16} /> Novo usuario
        </button>
      </div>

      {/* Cards por role */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Object.entries(roleConfig).map(([key, { label, color }]) => (
          <button key={key} onClick={() => { setRoleFilter(roleFilter === key ? '' : key as UserRole); setPage(0) }}
            className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${roleFilter === key ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${color}`}>{label}</span>
            <span className="text-2xl font-semibold text-zinc-800">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <FilterButton
          activeCount={Object.values(filters).filter(Boolean).length}
          onClick={() => setFilterOpen(!filterOpen)}
        />
      </div>

      <div className="flex gap-6">
        <FilterPanel
          open={filterOpen}
          config={[
            { key: 'email', label: 'E-mail', type: 'text' },
            { key: 'role', label: 'Perfil', type: 'select', options: [
              { value: 'ADMIN', label: 'Admin' },
              { value: 'EMPLOYEE', label: 'Funcionário' },
              { value: 'CLIENT', label: 'Cliente' },
            ]},
          ]}
          filters={filters}
          onChange={(f) => { setFilters(f); setPage(0) }}
        />
        <div className="flex-1 min-w-0">

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
          {paginated.map((user) => {
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

        </div>
      </div>

      {/* Paginacao */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
            className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-zinc-500 px-3">
            {page + 1} de {totalPages}
          </span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
            className="p-2 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-30 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Modal criar */}
      <Modal open={modalCreate} title="Novo usuario" onClose={() => setModalCreate(false)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        <UserForm initial={emptyForm} submitLabel="Cadastrar usuario" loading={createMutation.isPending}
          onSubmit={(data) => createMutation.mutate(data)} />
      </Modal>

      {/* Modal editar */}
      <Modal open={!!modalEdit} title="Editar usuario" onClose={() => setModalEdit(null)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        {modalEdit && (
          <UserForm
            key={getId(modalEdit)}
            initial={{
              email: modalEdit.email ?? '',
              password: '',
              role: modalEdit.role ?? 'CLIENT',
            }}
            submitLabel="Salvar alteracoes"
            loading={updateMutation.isPending}
            onSubmit={(data) => {
              const userData: User = { ...modalEdit, email: data.email, password: data.password, role: data.role }
              updateMutation.mutate({ id: getId(modalEdit), data: userData })
            }}
          />
        )}
      </Modal>

      {/* Modal confirmar exclusao */}
      <Modal open={!!confirmDelete} title="Excluir usuario" onClose={() => setConfirmDelete(null)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Tem certeza que deseja excluir o usuario{' '}
              <span className="font-medium text-zinc-800">{confirmDelete.email}</span>? Os dados vinculados (funcionario/cliente) serao removidos.
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
