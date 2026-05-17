import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Plus, X, Search, BedDouble, ChevronDown, Users, DollarSign } from 'lucide-react'
import {
  useFindAll1,
  useCreate1,
  useUpdate1,
  useDelete1,
  getFindAll1QueryKey,
} from '../services/room-controller/room-controller'
import type { Room, RoomStatus } from '../services/openAPIDefinition.schemas'

const emptyForm: Room = { number: '', type: '', description: '', capacity: 1, dailyRate: 0, status: 'AVAILABLE' }

const statusConfig: Record<string, { label: string; color: string }> = {
  AVAILABLE:   { label: 'Disponivel',  color: 'bg-green-100 text-green-700' },
  OCCUPIED:    { label: 'Ocupado',     color: 'bg-blue-100 text-blue-700' },
  MAINTENANCE: { label: 'Manutencao', color: 'bg-yellow-100 text-yellow-700' },
}

function getId(r: Room): string {
  const id = r.id as any
  if (!id) return ''
  if (id.$oid) return id.$oid
  if (typeof id === 'string') return id
  return id.toString()
}

const inputClass = "w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-zinc-300"
const labelClass = "text-xs font-medium text-zinc-500 uppercase tracking-wide"

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
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

interface FormProps { initial: Room; onSubmit: (data: Room) => void; loading: boolean; submitLabel: string }
function RoomForm({ initial, onSubmit, loading, submitLabel }: FormProps) {
  const [form, setForm] = useState<Room>(initial)

  const set = (field: keyof Room) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = field === 'capacity' || field === 'dailyRate' ? Number(e.target.value) : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form) }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className={labelClass}>Numero</label>
          <input value={form.number ?? ''} onChange={set('number')} required placeholder="Ex: 101" className={inputClass} />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <label className={labelClass}>Tipo</label>
          <input value={form.type ?? ''} onChange={set('type')} placeholder="Ex: Suite, Standard" className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Descricao</label>
        <input value={form.description ?? ''} onChange={set('description')} placeholder="Descricao do quarto" className={inputClass} />
      </div>

      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1.5">
          <label className={labelClass}>Capacidade</label>
          <input type="number" min={1} value={form.capacity ?? 1} onChange={set('capacity')} className={inputClass} />
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <label className={labelClass}>Diaria (R$)</label>
          <input type="number" min={0} step={0.01} value={form.dailyRate ?? 0} onChange={set('dailyRate')} className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Status</label>
        <div className="relative">
          <select value={form.status ?? 'AVAILABLE'} onChange={set('status')} className={`${inputClass} appearance-none`}>
            <option value="AVAILABLE">Disponivel</option>
            <option value="OCCUPIED">Ocupado</option>
            <option value="MAINTENANCE">Manutencao</option>
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

export function Quartos() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<RoomStatus | ''>('')
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState<Room | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Room | null>(null)

  const { data: rooms = [], isLoading } = useFindAll1()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getFindAll1QueryKey() })

  const createMutation = useCreate1({ mutation: { onSuccess: () => { invalidate(); setModalCreate(false) } } })
  const updateMutation = useUpdate1({ mutation: { onSuccess: () => { invalidate(); setModalEdit(null) } } })
  const deleteMutation = useDelete1({ mutation: { onSuccess: () => { invalidate(); setConfirmDelete(null) } } })

  const filtered = rooms.filter((r) => {
    const q = search.toLowerCase()
    const matchSearch = r.number?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
    const matchStatus = statusFilter ? r.status === statusFilter : true
    return matchSearch && matchStatus
  })

  const counts = Object.keys(statusConfig).reduce((acc, key) => {
    acc[key] = rooms.filter((r) => r.status === key).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">Quartos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Gerencie os quartos do hotel</p>
        </div>
        <button onClick={() => setModalCreate(true)}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-zinc-900 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors">
          <Plus size={16} /> Novo quarto
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(statusConfig).map(([key, { label, color }]) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? '' : key as RoomStatus)}
            className={`flex flex-col gap-1 p-3 rounded-xl border transition-all text-left ${statusFilter === key ? 'border-amber-400 bg-amber-50' : 'border-zinc-100 bg-white hover:border-zinc-200'}`}>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit ${color}`}>{label}</span>
            <span className="text-2xl font-semibold text-zinc-800">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por numero ou tipo..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent placeholder:text-zinc-300" />
      </div>

      {/* Cards de quartos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <BedDouble size={32} className="text-zinc-200" />
          <p className="text-zinc-400 text-sm">Nenhum quarto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((room) => {
            const status = statusConfig[room.status ?? ''] ?? { label: room.status, color: 'bg-zinc-100 text-zinc-500' }
            return (
              <div key={getId(room)} className="bg-white rounded-xl border border-zinc-100 p-4 flex flex-col gap-3">

                {/* Topo do card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                      <BedDouble size={18} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-800">Quarto {room.number}</p>
                      <p className="text-xs text-zinc-400">{room.type || '—'}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                {/* Descricao */}
                {room.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed">{room.description}</p>
                )}

                {/* Detalhes */}
                <div className="border-t border-zinc-50 pt-3 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users size={13} className="text-zinc-300" />
                    <span>{room.capacity} pessoa(s)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <DollarSign size={13} className="text-zinc-300" />
                    <span>R$ {room.dailyRate?.toFixed(2)}/dia</span>
                  </div>
                </div>

                {/* Acoes */}
                <div className="flex gap-2">
                  <button onClick={() => setModalEdit(room)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-zinc-500 border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:text-amber-500 hover:border-amber-200 transition-colors">
                    <Pencil size={13} /> Editar
                  </button>
                  <button onClick={() => setConfirmDelete(room)}
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
      <Modal open={modalCreate} title="Novo quarto" onClose={() => setModalCreate(false)}>
        <RoomForm initial={emptyForm} submitLabel="Cadastrar quarto" loading={createMutation.isPending}
          onSubmit={(data) => createMutation.mutate({ data })} />
      </Modal>

      {/* Modal editar */}
      <Modal open={!!modalEdit} title="Editar quarto" onClose={() => setModalEdit(null)}>
        {modalEdit && (
          <RoomForm initial={modalEdit} submitLabel="Salvar alteracoes" loading={updateMutation.isPending}
            onSubmit={(data) => updateMutation.mutate({ id: getId(modalEdit), data })} />
        )}
      </Modal>

      {/* Modal confirmar exclusao */}
      <Modal open={!!confirmDelete} title="Excluir quarto" onClose={() => setConfirmDelete(null)}>
        {confirmDelete && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600">
              Tem certeza que deseja excluir o quarto{' '}
              <span className="font-medium text-zinc-800">{confirmDelete.number}</span>? Esta acao nao pode ser desfeita.
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