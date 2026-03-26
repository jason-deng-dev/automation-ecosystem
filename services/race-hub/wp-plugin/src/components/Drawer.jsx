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
  const dragStart = useRef(null)

  useEffect(() => {
    setActiveImg(0)
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
        className={`fixed right-0 top-0 z-50 h-screen w-full md:w-120 bg-surface border-l border-border flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
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

            {/* Image gallery */}
            <div className="relative shrink-0">
              <div
                ref={galleryRef}
                onScroll={handleGalleryScroll}
                onTouchStart={e => e.stopPropagation()}
                onTouchEnd={e => e.stopPropagation()}
                onMouseDown={e => { dragStart.current = { x: e.pageX, scrollLeft: galleryRef.current.scrollLeft } }}
                onMouseMove={e => {
                  if (!dragStart.current) return
                  e.preventDefault()
                  galleryRef.current.scrollLeft = dragStart.current.scrollLeft - (e.pageX - dragStart.current.x) * 2
                }}
                onMouseUp={() => { dragStart.current = null }}
                onMouseLeave={() => { dragStart.current = null }}
                className="w-full h-64 overflow-x-auto flex snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none"
              >
                {race.images?.filter(Boolean).map((img, i) => (
                  <div key={i} className="relative flex-none w-full h-full snap-start">
                    <img src={img} alt={race.name} draggable="false" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              {race.images?.filter(Boolean).length > 1 && (
                <>
                  {/* Desktop arrows */}
                  {activeImg > 0 && (
                    <button
                      onClick={() => galleryRef.current.scrollTo({ left: (activeImg - 1) * galleryRef.current.offsetWidth, behavior: 'smooth' })}
                      className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                    >
                      <span className="material-symbols-outlined text-white text-[18px]">chevron_left</span>
                    </button>
                  )}
                  {activeImg < race.images.filter(Boolean).length - 1 && (
                    <button
                      onClick={() => galleryRef.current.scrollTo({ left: (activeImg + 1) * galleryRef.current.offsetWidth, behavior: 'smooth' })}
                      className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                    >
                      <span className="material-symbols-outlined text-white text-[18px]">chevron_right</span>
                    </button>
                  )}

                  {/* Dot indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {race.images.filter(Boolean).map((_, i) => (
                      <span
                        key={i}
                        className={`block rounded-full transition-all duration-200 ${i === activeImg ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="p-6 space-y-6">

                {/* Title */}
                <section className="space-y-3">
                  <Badge status={status} />
                  <h1 className="font-headline font-black text-3xl uppercase tracking-tighter leading-none text-ink">
                    {race.name}
                  </h1>
                  {race.description && (
                    <p className="text-[13px] text-muted leading-relaxed font-body">{race.description}</p>
                  )}
                </section>

                {/* Metadata */}
                <section className="border-t border-border">
                  <InfoRows info={race.info} />
                </section>

                {/* Notice */}
                {race.notice?.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted">Notes</h3>
                    <ul className="space-y-2">
                      {race.notice.map((note, i) => (
                        <li key={i} className="text-[13px] text-muted leading-relaxed flex gap-2">
                          <span className="shrink-0">·</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
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
