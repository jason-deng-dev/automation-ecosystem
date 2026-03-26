import { useRef, useState, useEffect } from 'react'
import Badge from './Badge'
import { getEntryStatus } from '../utils/status'

function InfoRows({ info }) {
  if (!info) return null
  return (
    <>
      {Object.entries(info).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return (
            <div key={key} className="py-4 border-b border-border">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-muted uppercase mb-2">{key}</label>
              {Object.entries(value).map(([subKey, subVal]) => (
                <div key={subKey} className="mb-2">
                  <span className="text-[11px] text-muted uppercase tracking-wide">{subKey}: </span>
                  <span className="text-[13px] text-ink">{subVal}</span>
                </div>
              ))}
            </div>
          )
        }
        return (
          <div key={key} className="flex items-start justify-between py-4 border-b border-border gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.2em] text-muted uppercase mb-1">{key}</label>
              <span className="block text-[15px] font-medium text-ink leading-snug">{value}</span>
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function Drawer({ race, onClose }) {
  const isOpen = !!race
  const status = race ? getEntryStatus(race.entryEnd) : null
  const touchStartX = useRef(null)
  const galleryRef = useRef(null)
  const [activeImg, setActiveImg] = useState(0)
  const [infoExpanded, setInfoExpanded] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)

  useEffect(() => {
    setActiveImg(0)
    setInfoExpanded(false)
    setNotesExpanded(false)
    if (galleryRef.current) galleryRef.current.scrollLeft = 0
  }, [race])

  function handleGalleryScroll() {
    const el = galleryRef.current
    if (!el) return
    setActiveImg(Math.round(el.scrollLeft / el.offsetWidth))
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX > 80) onClose()
    touchStartX.current = null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`
          fixed z-50 bg-surface flex flex-col overflow-hidden
          transition-all duration-300 ease-in-out
          w-full h-screen right-0 top-0 border-l border-border
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          md:w-180 md:max-h-[88vh] md:h-auto
          md:right-auto md:left-1/2 md:top-1/2
          md:border md:shadow-2xl
          md:[translate:-50%_-50%]
          ${isOpen ? 'md:scale-100 md:opacity-100' : 'md:scale-95 md:opacity-0 md:pointer-events-none'}
        `}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle — mobile only */}
        <div className="md:hidden absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pl-1 pr-2 py-6 flex items-center">
          <div className="w-1 h-10 rounded-full bg-white/60" />
        </div>

        {race && (
          <>
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <span className="material-symbols-outlined text-white text-[18px] block">close</span>
            </button>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="p-6 space-y-5">

                {/* Title */}
                <section className="flex items-start justify-between gap-3 pr-10">
                  <h1 className="font-headline font-black text-2xl uppercase tracking-tighter leading-tight text-ink">
                    {race.name}
                  </h1>
                  <div className="shrink-0 mt-1"><Badge status={status} /></div>
                </section>

                {/* Key info table */}
                <section className="border-t border-border pt-4 space-y-0">
                  {race.date && (
                    <div className="flex gap-4 py-2.5 border-b border-border">
                      <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Date</span>
                      <span className="text-[13px] text-ink">{race.date}</span>
                    </div>
                  )}
                  {race.location && (
                    <div className="flex gap-4 py-2.5 border-b border-border">
                      <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Location</span>
                      <span className="text-[13px] text-ink">{race.location}</span>
                    </div>
                  )}
                  {(race.entryStart || race.entryEnd) && (
                    <div className="flex gap-4 py-2.5 border-b border-border">
                      <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Entry Period</span>
                      <span className="text-[13px] text-ink">{[race.entryStart, race.entryEnd].filter(Boolean).join(' — ')}</span>
                    </div>
                  )}
                  {race.website && (
                    <div className="flex gap-4 py-2.5 border-b border-border">
                      <span className="w-28 shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Website</span>
                      <a href={race.website} target="_blank" rel="noopener noreferrer" className="text-[13px] text-accent hover:underline truncate">{race.website}</a>
                    </div>
                  )}
                </section>

                {/* Images — swipe gallery on mobile, strip on desktop */}
                {race.images?.filter(Boolean).length > 0 && (
                  <>
                    {/* Mobile: swipe gallery */}
                    <div className="relative md:hidden">
                      <div
                        ref={galleryRef}
                        onScroll={handleGalleryScroll}
                        onTouchStart={e => e.stopPropagation()}
                        onTouchEnd={e => e.stopPropagation()}
                        className="flex aspect-video overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                      >
                        {race.images.filter(Boolean).map((img, i) => (
                          <div key={i} className="relative flex-none w-full h-full snap-start">
                            <img src={img} alt={race.name} className="absolute inset-0 w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                      {race.images.filter(Boolean).length > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {race.images.filter(Boolean).map((_, i) => (
                            <span key={i} className={`block rounded-full transition-all duration-200 ${i === activeImg ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Desktop: side-by-side strip */}
                    <div className="hidden md:flex gap-0.5 h-36">
                      {race.images.filter(Boolean).map((img, i) => (
                        <div key={i} className="relative flex-1 overflow-hidden">
                          <img src={img} alt={race.name} className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Description */}
                {race.description && (
                  <p className="text-[13px] text-muted leading-relaxed font-body">{race.description}</p>
                )}

                {/* Full details — accordion */}
                {race.info && (
                  <section className="border-t border-border">
                    <button
                      onClick={() => setInfoExpanded(v => !v)}
                      className="w-full flex items-center justify-between py-4 text-left"
                    >
                      <span className="font-headline font-bold text-[13px] uppercase tracking-widest text-ink">Race Information</span>
                      <span className={`material-symbols-outlined text-muted text-[20px] transition-transform duration-300 ${infoExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${infoExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <InfoRows info={Object.fromEntries(Object.entries(race.info).filter(([k]) => !['Date','Location'].includes(k)))} />
                      </div>
                    </div>
                  </section>
                )}

                {/* Notice — accordion */}
                {race.notice?.length > 0 && (
                  <section className="border-t border-border">
                    <button
                      onClick={() => setNotesExpanded(v => !v)}
                      className="w-full flex items-center justify-between py-4 text-left"
                    >
                      <span className="font-headline font-bold text-[13px] uppercase tracking-widest text-ink">Notes</span>
                      <span className={`material-symbols-outlined text-muted text-[20px] transition-transform duration-300 ${notesExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${notesExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                      <div className="overflow-hidden">
                        <ul className="space-y-2 pb-4">
                          {race.notice.map((note, i) => (
                            <li key={i} className="text-[13px] text-muted leading-relaxed flex gap-2">
                              <span className="shrink-0">·</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>

            {/* CTA */}
            <div className="shrink-0 p-6 border-t border-border bg-surface">
              <a
                href={race.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-accent text-white font-headline font-bold text-sm py-5 tracking-[0.25em] uppercase text-center hover:bg-accent-dark transition-colors"
              >
                Register Now
              </a>
              {race.website && (
                <a
                  href={race.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full mt-2 py-3 text-center font-body text-[12px] uppercase tracking-widest text-muted hover:text-ink transition-colors underline underline-offset-4"
                >
                  Official Site
                </a>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}
