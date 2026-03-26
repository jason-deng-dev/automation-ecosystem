const STATUS_CONFIG = {
  open:          { label: 'Open',         bg: 'bg-success-bg', text: 'text-success' },
  'closing-soon': { label: 'Closing Soon', bg: 'bg-warning-bg', text: 'text-warning' },
  closed:        { label: 'Closed',       bg: 'bg-[#E8E8E4]',  text: 'text-disabled' },
}

export default function Badge({ status }) {
  const { label, bg, text } = STATUS_CONFIG[status] ?? STATUS_CONFIG.closed
  return (
    <span className={`inline-flex items-center px-2 py-1 text-[11px] font-body font-medium uppercase tracking-[0.08em] rounded-none ${bg} ${text}`}>
      {label}
    </span>
  )
}
