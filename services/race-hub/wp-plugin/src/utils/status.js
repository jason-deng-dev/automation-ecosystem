const CLOSING_SOON_DAYS = 14

export function getEntryStatus(entryEnd) {
  if (!entryEnd) return 'closed'
  const end = new Date(entryEnd)
  if (isNaN(end)) return 'closed'
  const now = new Date()
  const msRemaining = end - now
  if (msRemaining < 0) return 'closed'
  if (msRemaining <= CLOSING_SOON_DAYS * 24 * 60 * 60 * 1000) return 'closing-soon'
  return 'open'
}
