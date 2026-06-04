import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, X, User, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useFindAll4,
  useUpdate4,
  useDelete4,
  getFindAll4QueryKey,
} from '../../services/client-controller/client-controller'
import type { Client } from '../../services/openAPIDefinition.schemas'
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
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

interface FormProps {
  initial: Client
  onSubmit: (data: Client) => void
  loading: boolean
  submitLabel: string
}

function ClientForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<Client>(initial)

  const set = (field: keyof Client) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value
    if (field === 'cpf') value = formatCPF(value)
    if (field === 'phone') value = formatPhone(value)
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  const fields: { label: string; field: keyof Client; type?: string; placeholder: string }[] = [
    { label: 'Nome', field: 'name', placeholder: 'Nome completo' },
    { label: 'CPF', field: 'cpf', placeholder: '000.000.000-00' },
    { label: 'E-mail', field: 'email', type: 'email', placeholder: 'email@exemplo.com' },
    { label: 'Telefone', field: 'phone', placeholder: '(00) 00000-0000' },
    { label: 'Endereco', field: 'address', placeholder: 'Rua, numero, cidade' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {fields.map(({ label, field, type, placeholder }) => (
        <div key={field} className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{label}</label>
          <input
            type={type ?? 'text'}
            value={(form[field] as string) ?? ''}
            onChange={set(field)}
            placeholder={placeholder}
            required={field !== 'address'}
            className="border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent placeholder:text-zinc-300"
          />
        </div>
      ))}
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

export function Clientes() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [modalEdit, setModalEdit] = useState<Client | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null)
  const [error, setError] = useState('')

  const { data: clients = [], isLoading } = useFindAll4()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll4QueryKey() })

  const updateMutation = useUpdate4({
    mutation: {
      onSuccess: () => { invalidate(); setModalEdit(null); setError('') },
      onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao atualizar cliente'),
    },
  })

  const deleteMutation = useDelete4({
    mutation: {
      onSuccess: () => { invalidate(); setConfirmDelete(null); setError('') },
      onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao excluir cliente'),
    },
  })

  const filtered = clients.filter((c) => {
    if (filters.name && !(c.name ?? '').toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.cpf && !(c.cpf ?? '').includes(filters.cpf)) return false
    if (filters.email && !(c.email ?? '').toLowerCase().includes(filters.email.toLowerCase())) return false
    if (filters.phone && !(c.phone ?? '').includes(filters.phone)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const getId = (client: Client) => {
    const id = client.id as unknown as { $oid?: string } | string
    if (typeof id === 'string') return id
    if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''
    return ''
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Clientes</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie o cadastro de clientes</p>
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
            { key: 'email', label: 'E-mail', type: 'text' },
            { key: 'phone', label: 'Telefone', type: 'text' },
          ]}
          filters={filters}
          onChange={(f) => { setFilters(f); setPage(0) }}
        />
        <div className="flex-1 min-w-0">

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <User size={32} className="text-zinc-200" />
            <p className="text-zinc-400 text-sm">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Telefone</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {paginated.map((client) => (
                <tr key={getId(client)} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-800">{client.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{client.cpf}</td>
                  <td className="px-4 py-3 text-zinc-500">{client.email}</td>
                  <td className="px-4 py-3 text-zinc-500">{client.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalEdit(client)}
                        className="p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(client)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
      <Modal open={!!modalEdit} title="Editar cliente" onClose={() => setModalEdit(null)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        {modalEdit && (
          <ClientForm
            initial={modalEdit}
            submitLabel="Salvar alteracoes"
            loading={updateMutation.isPending}
            onSubmit={(data) => updateMutation.mutate({ id: getId(modalEdit), data })}
          />
        )}
      </Modal>

      {/* Modal confirmar exclusao */}
      <Modal open={!!confirmDelete} title="Excluir cliente" onClose={() => setConfirmDelete(null)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Tem certeza que deseja excluir o cliente{' '}
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
