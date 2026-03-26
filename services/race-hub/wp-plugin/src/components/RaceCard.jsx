import { useEffect, useRef } from 'react'
import Badge from './Badge'
import { getEntryStatus } from '../utils/status'

export default function RaceCard({ race, index, onClick }) {
  const ref = useRef(null)
  const status = getEntryStatus(race.entryEnd)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('is-visible'); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <article
      ref={ref}
      className="bg-surface overflow-hidden shadow-sm group cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md card-animate flex flex-col"
      style={{ transitionDelay: `${Math.min(index, 5) * 15}ms` }}
      onClick={onClick}
    >
      {/* Image */}
      {race.images?.[0] && (
        <div className="relative aspect-video overflow-hidden">
          <img
            src={race.images[0]}
            alt={race.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute top-3 left-3">
            <Badge status={status} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        {!race.images?.[0] && <div className="mb-3"><Badge status={status} /></div>}
        <h3 className="font-headline font-bold text-[17px] text-ink tracking-tight uppercase leading-tight mb-1">
          {race.name}
        </h3>
        <p className="font-body text-[13px] text-muted">
          {race.date}{race.location ? ` · ${race.location}` : ''}
        </p>
        <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
          <span className="text-[11px] font-body uppercase tracking-widest text-muted">View Details</span>
          <span className="material-symbols-outlined text-muted text-[18px]">arrow_forward</span>
        </div>
      </div>
    </article>
  )
}
