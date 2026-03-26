export default function FilterBar({
  search, onSearchChange,
  statusFilter, onStatusChange,
  count,
  activeFilters, onRemoveFilter, onClearAll,
}) {
  return (
    <div className="sticky top-0 z-40 w-full border-b border-border bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">

        {/* Controls row */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 flex-grow md:flex-row md:items-center">

            {/* Search */}
            <div className="relative flex-grow max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[18px]">search</span>
              <input
                type="text"
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="SEARCH RACES..."
                className="w-full border border-border bg-transparent py-2.5 pl-10 pr-4 font-body text-[13px] text-ink placeholder:text-disabled focus:border-ink focus:outline-none rounded-none transition-colors"
              />
            </div>

            {/* Status dropdown */}
            <div className="relative min-w-[140px]">
              <label className="absolute -top-2 left-2 bg-surface px-1 font-headline text-[9px] font-bold uppercase tracking-[0.15em] text-muted z-10">Status</label>
              <select
                value={statusFilter}
                onChange={e => onStatusChange(e.target.value)}
                className="w-full border border-border bg-transparent py-2.5 pl-3 pr-8 font-body text-[13px] text-ink focus:border-ink focus:outline-none rounded-none appearance-none transition-colors"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closing-soon">Closing Soon</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Count */}
          <span className="font-body text-[13px] font-semibold uppercase tracking-[0.05em] text-muted shrink-0">
            {count} {count === 1 ? 'Race' : 'Races'}
          </span>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Active:</span>
            {activeFilters.map(f => (
              <div key={f.id} className="flex items-center border border-border bg-bg px-2 py-1 hover:border-muted transition-colors">
                <span className="font-body text-[11px] font-medium uppercase tracking-[0.08em] text-ink">{f.label}</span>
                <button onClick={() => onRemoveFilter(f.id)} className="ml-2 text-muted hover:text-ink transition-colors leading-none">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            ))}
            <button onClick={onClearAll} className="ml-1 font-body text-[10px] font-bold uppercase tracking-[0.1em] text-muted underline underline-offset-4 hover:text-ink transition-colors">
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
