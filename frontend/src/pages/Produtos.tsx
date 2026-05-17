import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X, Search, Box } from 'lucide-react'
import {
  useFindAll2,
  useCreate2,
  useUpdate2,
  useDelete2,
  getFindAll2QueryKey,
} from '../services/product-controller/product-controller'
import type { Product } from '../services/openAPIDefinition.schemas'

const emptyForm: Product = { name: '', category: '', price: 0, active: true }

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
  initial: Product
  onSubmit: (data: Product) => void
  loading: boolean
  submitLabel: string
}

function ProductForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<Product>(initial)

  const set = (field: keyof Product) => (e: any) => {
    const value = field === 'active' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Nome</label>
        <input value={form.name ?? ''} onChange={set('name')} required className="border px-3 py-2 rounded-lg" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Categoria</label>
        <input value={form.category ?? ''} onChange={set('category')} className="border px-3 py-2 rounded-lg" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Preço</label>
        <input type="number" value={form.price ?? 0} onChange={set('price')} className="border px-3 py-2 rounded-lg" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active ?? false} onChange={set('active')} /> Ativo
      </label>
      <button type="submit" disabled={loading} className="mt-2 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg">
        {loading ? 'Salvando...' : submitLabel}
      </button>
    </form>
  )
}

export function Produtos() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState<Product | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)

  const { data: products = [], isLoading } = useFindAll2()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll2QueryKey() })

  const createMutation = useCreate2({ mutation: { onSuccess: () => { invalidate(); setModalCreate(false) } } })
  const updateMutation = useUpdate2({ mutation: { onSuccess: () => { invalidate(); setModalEdit(null) } } })
  const deleteMutation = useDelete2({ mutation: { onSuccess: () => { invalidate(); setConfirmDelete(null) } } })

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    return p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
  })

  const getId = (p: Product) => {
    const id = p.id as unknown as { $oid?: string } | string
    if (typeof id === 'string') return id
    if (id && typeof id === 'object' && '$oid' in id) return id.$oid ?? ''
    return ''
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Produtos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie os produtos</p>
        </div>
        <button onClick={() => setModalCreate(true)} className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg">
          <Plus size={16} /> Novo produto
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou categoria..." className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg" />
      </div>

      <div className="bg-white rounded-xl border border-zinc-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Box size={32} className="text-zinc-200" />
            <p className="text-zinc-400 text-sm">Nenhum produto encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Categoria</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-400 uppercase">Preço</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={getId(p)} className="border-b hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-800">{p.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.category}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.price?.toFixed?.(2) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setModalEdit(p)} className="p-1.5 text-zinc-400 hover:text-amber-500 rounded-lg" title="Editar"><Pencil size={15} /></button>
                      <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg" title="Excluir"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalCreate} title="Novo produto" onClose={() => setModalCreate(false)}>
        <ProductForm initial={emptyForm} submitLabel="Cadastrar produto" loading={createMutation.isPending} onSubmit={(data) => createMutation.mutate({ data })} />
      </Modal>

      <Modal open={!!modalEdit} title="Editar produto" onClose={() => setModalEdit(null)}>
        {modalEdit && (
          <ProductForm initial={modalEdit} submitLabel="Salvar alteracoes" loading={updateMutation.isPending} onSubmit={(data) => updateMutation.mutate({ id: getId(modalEdit), data })} />
        )}
      </Modal>

      <Modal open={!!confirmDelete} title="Excluir produto" onClose={() => setConfirmDelete(null)}>
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">Tem certeza que deseja excluir o produto <span className="font-medium text-zinc-800">{confirmDelete.name}</span>? Esta acao nao pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-zinc-600 border rounded-lg">Cancelar</button>
              <button onClick={() => deleteMutation.mutate({ id: getId(confirmDelete) })} disabled={deleteMutation.isPending} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg">{deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
