import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, X, UserCog, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useFindAll3,
  useUpdate3,
  useDelete3,
  getFindAll3QueryKey,
} from '../../services/employee-controller/employee-controller'
import {
  useFindAll,
  getFindAllQueryKey,
} from '../../services/user-controller/user-controller'
import type { Employee, User } from '../../services/openAPIDefinition.schemas'
import { FilterButton, FilterPanel } from '../../components/FilterPanel'

const PAGE_SIZE = 20

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

function getInitials(name?: string) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

function Modal({ open, title, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-800">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

function getId(obj: { id?: unknown }): string {
  const id = obj.id as any
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return id.toString()
}

function getUserLabel(user: User): string {
  return `${user.email} (${user.role ?? '—'})`
}

interface FormProps {
  initial: Employee
  onSubmit: (data: Employee) => void
  loading: boolean
  submitLabel: string
  users?: User[]
  mode: 'create' | 'edit'
}

function EmployeeForm({ initial, onSubmit, loading, submitLabel, users, mode }: FormProps) {
  const [form, setForm] = useState<Employee>(initial)

  const set = (field: keyof Employee) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let value = e.target.value
    if (field === 'cpf') value = formatCPF(value)
    if (field === 'phone') value = formatPhone(value)
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const fields: { label: string; field: keyof Employee; placeholder: string }[] = [
    { label: 'Nome', field: 'name', placeholder: 'Nome completo' },
    { label: 'CPF', field: 'cpf', placeholder: '000.000.000-00' },
    { label: 'Telefone', field: 'phone', placeholder: '(00) 00000-0000' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {fields.map(({ label, field, placeholder }) => (
        <div key={field} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>
          <input
            type="text"
            value={(form[field] as string) ?? ''}
            onChange={set(field)}
            placeholder={placeholder}
            required
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent placeholder:text-zinc-300"
          />
        </div>
      ))}

      {mode === 'create' && users && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Vincular usuario</label>
          <div className="relative">
            <select
              value={(form.userId as any)?.$oid ?? ''}
              onChange={(e) => {
                const selected = users.find((u) => getId(u) === e.target.value)
                setForm((prev) => ({
                  ...prev,
                  userId: selected?.id as any,
                }))
              }}
              required
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent appearance-none"
            >
              <option value="">Selecione um usuario</option>
              {users.map((u) => (
                <option key={getId(u)} value={getId(u)}>
                  {getUserLabel(u)}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors"
      >
        {loading ? 'Salvando...' : submitLabel}
      </button>
    </form>
  )
}

export function Funcionarios() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [modalEdit, setModalEdit] = useState<Employee | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Employee | null>(null)
  const [error, setError] = useState('')

  const { data: employees = [], isLoading } = useFindAll3()
  const { data: allUsers = [] } = useFindAll()

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getFindAll3QueryKey() })
    queryClient.invalidateQueries({ queryKey: getFindAllQueryKey() })
  }

  const updateMutation = useUpdate3({
    mutation: {
      onSuccess: () => { invalidateAll(); setModalEdit(null); setError('') },
      onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao atualizar funcionário'),
    },
  })

  const deleteMutation = useDelete3({
    mutation: {
      onSuccess: () => { invalidateAll(); setConfirmDelete(null); setError('') },
      onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao excluir funcionário'),
    },
  })

  const filtered = employees.filter((e) => {
    if (filters.name && !(e.name ?? '').toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.cpf && !(e.cpf ?? '').includes(filters.cpf)) return false
    if (filters.phone && !(e.phone ?? '').includes(filters.phone)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const userMap = new Map(allUsers.map((u) => [getId(u), u]))

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Funcionarios</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie o cadastro de funcionarios</p>
        </div>
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
            { key: 'name', label: 'Nome', type: 'text' },
            { key: 'cpf', label: 'CPF', type: 'text' },
            { key: 'phone', label: 'Telefone', type: 'text' },
          ]}
          filters={filters}
          onChange={(f) => { setFilters(f); setPage(0) }}
        />
        <div className="flex-1 min-w-0">

      {/* Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
          Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <UserCog size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhum funcionario encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((employee) => (
            <div
              key={getId(employee)}
              className="bg-white rounded-xl border border-zinc-100 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold text-sm shrink-0">
                  {getInitials(employee.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-zinc-800 text-sm truncate">{employee.name}</p>
                  <p className="text-xs text-zinc-400">{employee.cpf}</p>
                </div>
              </div>

              <div className="border-t border-zinc-50 pt-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Telefone</span>
                  <span className="text-zinc-700">{employee.phone || '—'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Usuario</span>
                  <span className="text-zinc-700 truncate ml-2">
                    {userMap.get((employee.userId as any)?.$oid ?? '')?.email ?? '—'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setModalEdit(employee)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-amber-500 hover:border-amber-200 transition-colors"
                >
                  <Pencil size={13} />
                  Editar
                </button>
                <button
                  onClick={() => setConfirmDelete(employee)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              </div>
            </div>
          ))}
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

      {/* Modal editar */}
      <Modal open={!!modalEdit} title="Editar funcionario" onClose={() => setModalEdit(null)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        {modalEdit && (
          <EmployeeForm
            initial={modalEdit}
            submitLabel="Salvar alteracoes"
            loading={updateMutation.isPending}
            mode="edit"
            onSubmit={(data) => updateMutation.mutate({ id: getId(modalEdit), data })}
          />
        )}
      </Modal>

      {/* Modal confirmar exclusao */}
      <Modal open={!!confirmDelete} title="Excluir funcionario" onClose={() => setConfirmDelete(null)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Tem certeza que deseja excluir o funcionario{' '}
              <span className="font-medium text-zinc-800">{confirmDelete.name}</span>? Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: getId(confirmDelete) })}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}