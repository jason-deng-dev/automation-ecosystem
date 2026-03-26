// All distances are normalised to km (floats) so range filtering works consistently.

function parseKmFromString(str) {
  if (!str) return null

  // Normalise: strip newlines, full-width brackets/parens → standard, full-width digits → ASCII
  str = str
    .replace(/\n|\r/g, ' ')
    .replace(/【/g, '[').replace(/】/g, ']')
    .replace(/（/g, '(').replace(/）/g, ')')
    .replace(/[、・]/g, ' ')
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))

  // Named distances with no number
  if (/full\s*marathon/i.test(str) && !/\d/.test(str)) return 42.195
  if (/half\s*marathon/i.test(str) && !/\d/.test(str)) return 21.0975

  // Time-based events — no distance
  if (/\d+[-\s]hours?/i.test(str)) return null

  // Prefer the first explicit km value (ignores GPS-corrected values in parens that follow)
  // e.g. "30km (GPS 24.5km)" → 30, "【50K】51.2km" → 51.2
  // Strip elevation components before parsing: /±\d+m/, /D\+\d+m/, /\/\+\d+m/
  const stripped = str.replace(/[\/±]?\s*[Dd]?\+?\d+(\.\d+)?\s*m\b/g, '')

  // km / k / K — with optional space, decimal allowed
  const kmMatch = stripped.match(/(\d+(?:\.\d+)?)\s*[kK][mM]?(?!\w)/)
  if (kmMatch) return parseFloat(kmMatch[1])

  // miles — convert to km, prefer km equivalent already in string
  const miMatch = stripped.match(/(\d+(?:\.\d+)?)\s*mi\b/)
  if (miMatch) return parseFloat((parseFloat(miMatch[1]) * 1.60934).toFixed(2))

  // metres — convert to km
  const mMatch = stripped.match(/(\d+(?:\.\d+)?)\s*m\b/)
  if (mMatch) {
    const metres = parseFloat(mMatch[1])
    return metres >= 100 ? parseFloat((metres / 1000).toFixed(3)) : null
  }

  return null
}

function extractDistance(races) {
  return races.map((race) => {
    const eligibility = race.info?.['Event/Eligibility'] ?? {}
    const distances = Object.keys(eligibility)
      .map(parseKmFromString)
      .filter(d => d !== null)

    return { ...race, distances }
  })
}

export default extractDistance
