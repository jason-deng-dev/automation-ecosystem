import { useState, useEffect, useMemo } from 'react'
import FilterBar from './components/FilterBar'
import RaceCard from './components/RaceCard'
import SkeletonCard from './components/SkeletonCard'
import Drawer from './components/Drawer'
import { getEntryStatus } from './utils/status'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function App() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRace, setSelectedRace] = useState(null)

  useEffect(() => {
    fetch(`${API_URL}/api/races`)
      .then(r => {
        if (!r.ok) throw new Error(`Server error: ${r.status}`)
        return r.json()
      })
      .then(data => {
        setRaces(data.races || [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    return races.filter(race => {
      const matchesSearch = race.name.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'all' || getEntryStatus(race.entryEnd) === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [races, search, statusFilter])

  const activeFilters = useMemo(() => {
    const filters = []
    if (search) filters.push({ id: 'search', label: `"${search}"` })
    if (statusFilter !== 'all') filters.push({ id: 'status', label: `Status: ${statusFilter}` })
    return filters
  }, [search, statusFilter])

  function removeFilter(id) {
    if (id === 'search') setSearch('')
    if (id === 'status') setStatusFilter('all')
  }

  return (
    <div className="race-hub-root min-h-screen bg-bg font-body">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        count={filtered.length}
        activeFilters={activeFilters}
        onRemoveFilter={removeFilter}
        onClearAll={() => { setSearch(''); setStatusFilter('all') }}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 md:px-6">
        {error ? (
          <div className="py-24 text-center space-y-2">
            <p className="font-headline text-[13px] uppercase tracking-widest text-muted">Unable to load races</p>
            <p className="text-[13px] text-disabled">{error}</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-headline text-[13px] uppercase tracking-widest text-muted">No races match your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((race, i) => (
              <RaceCard
                key={race.url}
                race={race}
                index={i}
                onClick={() => setSelectedRace(race)}
              />
            ))}
          </div>
        )}
      </main>

      <Drawer race={selectedRace} onClose={() => setSelectedRace(null)} />
    </div>
  )
}
