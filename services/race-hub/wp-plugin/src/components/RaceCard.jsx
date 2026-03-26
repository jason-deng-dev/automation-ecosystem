import Badge from './Badge'
import { getEntryStatus } from '../utils/status'

export default function RaceCard({ race, index, onClick }) {
  const status = getEntryStatus(race.entryEnd)
  const isClosed = status === 'closed'

  return (
    <article
      className="bg-surface border border-border group cursor-pointer transition-all duration-300 hover:-translate-y-[2px] hover:border-[#C8C8C4] card-animate"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        {race.images?.[0] ? (
          <img
            src={race.images[0]}
            alt={race.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isClosed ? 'grayscale group-hover:grayscale-0' : ''}`}
          />
        ) : (
          <div className="w-full h-full bg-[#E8E8E4]" />
        )}
        <div className="absolute top-3 left-3">
          <Badge status={status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="font-headline font-bold text-[17px] text-ink tracking-tight uppercase leading-tight mb-1">
          {race.name}
        </h3>
        <p className="font-body text-[13px] text-muted mb-6">
          {race.date}{race.location ? ` · ${race.location}` : ''}
        </p>
        <div className="flex justify-between items-center border-t border-border pt-4">
          <span className="text-[11px] font-body uppercase tracking-widest text-muted">View Details</span>
          <span className="material-symbols-outlined text-muted text-[18px]">arrow_forward</span>
        </div>
      </div>
    </article>
  )
}
