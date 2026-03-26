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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside className={`fixed right-0 top-0 z-50 h-screen w-full md:w-[480px] bg-surface border-l border-border flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {race && (
          <>
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 border border-border bg-surface hover:border-muted transition-colors"
            >
              <span className="material-symbols-outlined text-ink text-[20px] block">close</span>
            </button>

            {/* Image gallery */}
            <div className="w-full h-64 overflow-x-auto flex snap-x snap-mandatory shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {race.images?.filter(Boolean).map((img, i) => (
                <div key={i} className="flex-none w-full h-full snap-start border-r border-border/30 last:border-r-0">
                  <img src={img} alt={race.name} className="w-full h-full object-cover grayscale-[0.1]" />
                </div>
              ))}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">

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
