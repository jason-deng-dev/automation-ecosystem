import { useState } from 'react'

const REGIONS = [
  'Hokkaido / Tohoku',
  'Kanto / Fuji',
  'Chubu / Hokuriku',
  'Kansai',
  'Chugoku / Shikoku',
  'Kyushu / Okinawa',
]

export default function FilterBar({
  title,
  search, onSearchChange,
  statusFilter, onStatusChange,
  regionFilter, onRegionChange,
  distanceCategory, onDistanceCategoryChange,
  distanceExact, onDistanceExactChange,
  distanceMin, onDistanceMinChange,
  distanceMax, onDistanceMaxChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  count,
  activeFilters, onRemoveFilter, onClearAll,
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-6">

        {/* Mobile title */}
        {title && (
          <div className="pt-4 md:hidden text-center">
            <span className="font-headline font-black text-[18px] uppercase tracking-tight text-ink leading-none">{title}</span>
          </div>
        )}

        {/* Primary row */}
        <div className="flex items-center gap-4 py-4">

          {/* Brand — desktop only */}
          {title && (
            <div className="shrink-0 pr-4 border-r border-border hidden md:block">
              <span className="font-headline font-black text-[18px] uppercase tracking-tight text-ink leading-none">{title}</span>
            </div>
          )}

          {/* Search */}
          <div className="relative flex-grow max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="SEARCH BY NAME OR CITY..."
              className="w-full border border-border bg-transparent py-2.5 pl-10 pr-4 font-body text-[13px] text-ink placeholder:text-disabled focus:border-ink focus:outline-none rounded-none transition-colors"
            />
          </div>

          {/* Status — always visible */}
          <div className="relative min-w-[130px] hidden md:block">
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

          {/* More filters toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className={`flex items-center gap-1.5 border px-3 py-2.5 font-body text-[11px] uppercase tracking-[0.1em] transition-colors ${expanded ? 'border-ink text-ink' : 'border-border text-muted hover:border-muted hover:text-ink'}`}
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            <span className="hidden sm:inline">Filters</span>
            {activeFilters.filter(f => f.id !== 'search' && f.id !== 'status').length > 0 && (
              <span className="w-1.5 h-1.5 bg-accent rounded-full" />
            )}
          </button>

          {/* Count */}
          <span className="font-body text-[13px] font-semibold uppercase tracking-[0.05em] text-muted shrink-0 ml-auto">
            {count} {count === 1 ? 'Race' : 'Races'}
          </span>
        </div>

        {/* Expanded filters — accordion */}
        {expanded && (
          <div className="border-t border-border py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">

            {/* Status — visible here on mobile too */}
            <div className="relative md:hidden">
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

            {/* Region */}
            <div className="relative">
              <label className="absolute -top-2 left-2 bg-surface px-1 font-headline text-[9px] font-bold uppercase tracking-[0.15em] text-muted z-10">Region</label>
              <select
                value={regionFilter}
                onChange={e => onRegionChange(e.target.value)}
                className="w-full border border-border bg-transparent py-2.5 pl-3 pr-8 font-body text-[13px] text-ink focus:border-ink focus:outline-none rounded-none appearance-none transition-colors"
              >
                <option value="all">All Regions</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Distance category */}
            <div className="relative">
              <label className="absolute -top-2 left-2 bg-surface px-1 font-headline text-[9px] font-bold uppercase tracking-[0.15em] text-muted z-10">Distance</label>
              <select
                value={distanceCategory}
                onChange={e => onDistanceCategoryChange(e.target.value)}
                className="w-full border border-border bg-transparent py-2.5 pl-3 pr-8 font-body text-[13px] text-ink focus:border-ink focus:outline-none rounded-none appearance-none transition-colors"
              >
                <option value="all">All Distances</option>
                <option value="10k">10K</option>
                <option value="half">Half Marathon</option>
                <option value="full">Full Marathon</option>
                <option value="ultra">Ultra</option>
                <option value="specify-distance">Specify Distance...</option>
                <option value="specify-range">Specify Range...</option>
              </select>

              {distanceCategory === 'specify-distance' && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-border bg-surface p-3">
                  <label className="block font-headline text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-2">Exact km</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={distanceExact}
                    onChange={e => onDistanceExactChange(e.target.value)}
                    placeholder="e.g. 42.195"
                    className="w-full border border-border bg-transparent py-2 px-3 font-body text-[13px] text-ink focus:border-ink focus:outline-none rounded-none transition-colors"
                  />
                </div>
              )}

              {distanceCategory === 'specify-range' && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-border bg-surface p-3 flex gap-2">
                  <div className="flex-1">
                    <label className="block font-headline text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-2">Min km</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={distanceMin}
                      onChange={e => onDistanceMinChange(e.target.value)}
                      placeholder="0"
                      className="w-full border border-border bg-transparent py-2 px-3 font-body text-[13px] text-ink focus:border-ink focus:outline-none rounded-none transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block font-headline text-[9px] font-bold uppercase tracking-[0.15em] text-muted mb-2">Max km</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={distanceMax}
                      onChange={e => onDistanceMaxChange(e.target.value)}
                      placeholder="∞"
                      className="w-full border border-border bg-transparent py-2 px-3 font-body text-[13px] text-ink focus:border-ink focus:outline-none rounded-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Date from */}
            <div className="relative">
              <label className="absolute -top-2 left-2 bg-surface px-1 font-headline text-[9px] font-bold uppercase tracking-[0.15em] text-muted z-10">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => onDateFromChange(e.target.value)}
                className="w-full border border-border bg-transparent py-2.5 px-3 font-body text-[13px] text-ink focus:border-ink focus:outline-none rounded-none transition-colors"
              />
            </div>

            {/* Date to */}
            <div className="relative">
              <label className="absolute -top-2 left-2 bg-surface px-1 font-headline text-[9px] font-bold uppercase tracking-[0.15em] text-muted z-10">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => onDateToChange(e.target.value)}
                className="w-full border border-border bg-transparent py-2.5 px-3 font-body text-[13px] text-ink focus:border-ink focus:outline-none rounded-none transition-colors"
              />
            </div>

          </div>
        )}

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="pb-3 flex flex-wrap items-center gap-2">
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
