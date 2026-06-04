import { SlidersHorizontal } from 'lucide-react'

export interface FilterDefinition {
  key: string
  label: string
  type: 'text' | 'select'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export function FilterButton({ activeCount, onClick }: {
  activeCount: number
  onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className="relative p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors shrink-0">
      <SlidersHorizontal size={16} className="text-zinc-500" />
      {activeCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold text-white bg-laranja rounded-full">
          {activeCount}
        </span>
      )}
    </button>
  )
}

export function FilterPanel({ open, config, filters, onChange }: {
  open: boolean
  config: FilterDefinition[]
  filters: Record<string, string>
  onChange: (filters: Record<string, string>) => void
}) {
  if (!open) return null

  const update = (key: string, value: string) => {
    const next = { ...filters }
    if (value) next[key] = value
    else delete next[key]
    onChange(next)
  }

  const clearAll = () => onChange({})

  return (
    <div className="w-64 shrink-0">
      <div className="border border-zinc-200 rounded-xl p-4 space-y-4 sticky top-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-zinc-700">Filtros</span>
          <button onClick={clearAll} className="text-xs text-laranja hover:underline">
            Limpar todos
          </button>
        </div>
        {config.map((def) => (
          <div key={def.key}>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide block mb-1.5">
              {def.label}
            </label>
            {def.type === 'select' ? (
              <select
                value={filters[def.key] ?? ''}
                onChange={(e) => update(def.key, e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde appearance-none bg-white"
              >
                <option value="">Todos</option>
                {def.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={filters[def.key] ?? ''}
                onChange={(e) => update(def.key, e.target.value)}
                placeholder={def.placeholder ?? ''}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-verde placeholder:text-zinc-300"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
