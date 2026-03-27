import { useEffect, useRef, useContext } from 'react'
import { LangContext } from '../App'
import enText from '../locales/en'
import zhText from '../locales/zh'
import Badge from './Badge'
import { getEntryStatus } from '../utils/status'

export default function RaceCard({ race, index, onClick }) {
  const [lang] = useContext(LangContext)
  const text = lang === 'en' ? enText : zhText
  const f = (field) => (lang === 'zh' && race[`${field}_zh`]) ? race[`${field}_zh`] : race[field]

  const ref = useRef(null)
  const status = getEntryStatus(race.entryEnd)
  const badgeLabel = { open: text.badge_open, 'closing-soon': text.badge_closing_soon, closed: text.badge_closed }[status] ?? text.badge_closed

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
            alt={f('name')}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3">
            <Badge status={status} label={badgeLabel} />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        {!race.images?.[0] && <div className="mb-3"><Badge status={status} label={badgeLabel} /></div>}
        <h3 className="font-headline font-bold text-[17px] text-ink tracking-tight uppercase leading-tight mb-1">
          {f('name')}
        </h3>
        <p className="font-body text-[13px] text-muted">
          {f('date')}{race.location ? ` · ${f('location')}` : ''}
        </p>
        <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
          <span className="text-[11px] font-body uppercase tracking-widest text-muted">{text.view_details}</span>
          <span className="material-symbols-outlined text-muted text-[18px]">arrow_forward</span>
        </div>
      </div>
    </article>
  )
}
