const STATUS_CONFIG = {
  open:           { bg: 'bg-success-bg', text: 'text-success' },
  'closing-soon': { bg: 'bg-warning-bg', text: 'text-warning' },
  closed:         { bg: 'bg-[#E0E0DE]',  text: 'text-muted'   },
}

export default function Badge({ status, label }) {
  const { bg, text } = STATUS_CONFIG[status] ?? STATUS_CONFIG.closed
  return (
    <span className={`inline-flex items-center px-2 py-1 text-[11px] font-body font-medium uppercase tracking-[0.08em] rounded-none ${bg} ${text}`}>
      {label}
    </span>
  )
}
