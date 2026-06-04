import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X, ShoppingBasket, Tag, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  useFindAll2,
  useCreate2,
  useUpdate2,
  useDelete2,
  getFindAll2QueryKey,
} from '../../services/product-controller/product-controller'
import type { Product } from '../../services/openAPIDefinition.schemas'
import { FilterButton, FilterPanel } from '../../components/FilterPanel'

const PAGE_SIZE = 20

const emptyForm: Product = { name: '', category: '', price: 0, active: true }

function getId(p: Product): string {
  const id = p.id as any
  if (!id) return ''
  if (typeof id === 'string') return id
  if (id.$oid) return id.$oid
  return id.toString()
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

interface FormProps { initial: Product; onSubmit: (data: Product) => void; loading: boolean; submitLabel: string }
function ProductForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<Product>(initial)

  const set = (field: keyof Product) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = field === 'price' ? Number(e.target.value) : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form) }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Nome</label>
        <input value={form.name ?? ''} onChange={set('name')} required placeholder="Nome do produto" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Categoria</label>
        <input value={form.category ?? ''} onChange={set('category')} required placeholder="Ex: Bebidas, Refeicoes" className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Preco (R$)</label>
        <input type="number" min={0} step={0.01} value={form.price ?? 0} onChange={set('price')} className={inputClass} />
      </div>

      <div className="flex items-center gap-3 bg-zinc-50 rounded-lg px-3 py-2.5">
        <div
          onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
          className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${form.active ? 'bg-amber-400' : 'bg-zinc-300'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
        <span className="text-sm text-zinc-600">{form.active ? 'Produto ativo' : 'Produto inativo'}</span>
      </div>

      <button type="submit" disabled={loading}
        className="mt-1 bg-amber-400 hover:bg-laranja disabled:opacity-50 text-zinc-900 font-medium text-sm py-2.5 rounded-lg transition-colors">
        {loading ? 'Salvando...' : submitLabel}
      </button>
    </form>
  )
}

export function Produtos() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(0)
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState<Product | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [error, setError] = useState('')

  const { data: products = [], isLoading } = useFindAll2()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll2QueryKey() })

  const createMutation = useCreate2({ mutation: { onSuccess: () => { invalidate(); setModalCreate(false); setError('') }, onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao criar produto') } })
  const updateMutation = useUpdate2({ mutation: { onSuccess: () => { invalidate(); setModalEdit(null); setError('') }, onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao atualizar produto') } })
  const deleteMutation = useDelete2({ mutation: { onSuccess: () => { invalidate(); setConfirmDelete(null); setError('') }, onError: (err) => setError((err as any)?.response?.data?.message || 'Erro ao excluir produto') } })

  const categoryOptions = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean))
    return Array.from(set).map((c) => ({ value: c, label: c })) as { value: string; label: string }[]
  }, [products])

  const filtered = products.filter((p) => {
    const matchActive = activeFilter === 'all' ? true : activeFilter === 'active' ? p.active : !p.active
    if (!matchActive) return false
    if (filters.name && !(p.name ?? '').toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.category && p.category !== filters.category) return false
    if (filters.priceMin) {
      const min = parseFloat(filters.priceMin)
      if (!isNaN(min) && (p.price ?? 0) < min) return false
    }
    if (filters.priceMax) {
      const max = parseFloat(filters.priceMax)
      if (!isNaN(max) && (p.price ?? 0) > max) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const totalAtivos = products.filter((p) => p.active).length
  const totalInativos = products.filter((p) => !p.active).length

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Produtos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie os produtos e consumiveis do hotel</p>
        </div>
        <button onClick={() => setModalCreate(true)}
          className="flex items-center justify-center bg-amber-400 hover:bg-laranja text-zinc-900 font-medium rounded-lg transition-colors w-10 h-10">
          <Plus size={18} />
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => { setActiveFilter('all'); setPage(0) }}
          className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${activeFilter === 'all' ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full w-fit bg-zinc-100 text-zinc-600">Total</span>
          <span className="text-2xl font-semibold text-zinc-800">{products.length}</span>
        </button>
        <button onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
          className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${activeFilter === 'active' ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full w-fit bg-verde/10 text-verde">Ativos</span>
          <span className="text-2xl font-semibold text-zinc-800">{totalAtivos}</span>
        </button>
        <button onClick={() => setActiveFilter(activeFilter === 'inactive' ? 'all' : 'inactive')}
          className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${activeFilter === 'inactive' ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full w-fit bg-zinc-100 text-zinc-500">Inativos</span>
          <span className="text-2xl font-semibold text-zinc-800">{totalInativos}</span>
        </button>
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
            { key: 'category', label: 'Categoria', type: 'select', options: categoryOptions },
            { key: 'priceMin', label: 'Preço mín.', type: 'text', placeholder: 'R$ 0,00' },
            { key: 'priceMax', label: 'Preço máx.', type: 'text', placeholder: 'R$ 999,99' },
          ]}
          filters={filters}
          onChange={(f) => { setFilters(f); setPage(0) }}
        />
        <div className="flex-1 min-w-0">

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <ShoppingBasket size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhum produto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginated.map((product) => (
            <div key={getId(product)} className={`bg-white rounded-xl border p-4 flex flex-col gap-3 transition-opacity ${product.active ? 'border-zinc-100' : 'border-zinc-100 opacity-60'}`}>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <ShoppingBasket size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-800 text-sm">{product.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Tag size={11} className="text-zinc-300" />
                      <span className="text-xs text-zinc-400">{product.category || 'Sem categoria'}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${product.active ? 'bg-verde/10 text-verde' : 'bg-zinc-100 text-zinc-500'}`}>
                  {product.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 border-t border-zinc-50 pt-3">
                <DollarSign size={14} className="text-amber-400" />
                <span className="text-base font-semibold text-zinc-800">R$ {product.price?.toFixed(2)}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setModalEdit(product)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-amber-500 hover:border-amber-200 transition-colors">
                  <Pencil size={13} /> Editar
                </button>
                <button onClick={() => setConfirmDelete(product)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                  <Trash2 size={13} /> Excluir
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

      {/* Modal criar */}
      <Modal open={modalCreate} title="Novo produto" onClose={() => setModalCreate(false)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        <ProductForm initial={emptyForm} submitLabel="Cadastrar produto" loading={createMutation.isPending}
          onSubmit={(data) => createMutation.mutate({ data })} />
      </Modal>

      {/* Modal editar */}
      <Modal open={!!modalEdit} title="Editar produto" onClose={() => setModalEdit(null)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        {modalEdit && (
          <ProductForm initial={modalEdit} submitLabel="Salvar alteracoes" loading={updateMutation.isPending}
            onSubmit={(data) => updateMutation.mutate({ id: getId(modalEdit), data })} />
        )}
      </Modal>

      {/* Modal confirmar exclusao */}
      <Modal open={!!confirmDelete} title="Excluir produto" onClose={() => setConfirmDelete(null)}>
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-3">{error}</div>}
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Tem certeza que deseja excluir o produto{' '}
              <span className="font-medium text-zinc-800">{confirmDelete.name}</span>? Esta acao nao pode ser desfeita.
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