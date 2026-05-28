import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, X, Search, User } from 'lucide-react'
import {
  useFindAll4,
  useUpdate4,
  useDelete4,
  getFindAll4QueryKey,
} from '../../services/client-controller/client-controller'
import type { Client } from '../../services/openAPIDefinition.schemas'

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
  const [search, setSearch] = useState('')
  const [modalEdit, setModalEdit] = useState<Client | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null)

  const { data: clients = [], isLoading } = useFindAll4()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll4QueryKey() })

  const updateMutation = useUpdate4({
    mutation: {
      onSuccess: () => { invalidate(); setModalEdit(null) },
    },
  })

  const deleteMutation = useDelete4({
    mutation: {
      onSuccess: () => { invalidate(); setConfirmDelete(null) },
    },
  })

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(q) ||
      c.cpf?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Buscar por nome, CPF ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-verde focus:border-transparent placeholder:text-zinc-300"
        />
      </div>

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
              {filtered.map((client) => (
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

      {/* Modal editar */}
      <Modal open={!!modalEdit} title="Editar cliente" onClose={() => setModalEdit(null)}>
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
