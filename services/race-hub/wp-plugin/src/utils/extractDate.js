// Parses the race date string into a JS Date object and extracts year/month
// for use in date range and month filtering.
// Input format: "March 29 2026"

function extractDate(races) {
  return races.map(race => {
    const parsed = race.date ? new Date(race.date) : null
    const dateObj = parsed && !isNaN(parsed) ? parsed : null
    return {
      ...race,
      dateObj,                              // full Date — for range filtering
      month: dateObj ? dateObj.getMonth() : null,  // 0-indexed (0 = Jan)
      year:  dateObj ? dateObj.getFullYear() : null,
    }
  })
}

export default extractDate
