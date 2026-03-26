// Extracts the prefecture from the location string and maps it to a region.
// Location strings are consistently formatted: "City (Prefecture) , Japan"

const PREFECTURE_TO_REGION = {
  // Hokkaido / Tohoku
  'Hokkaido': 'Hokkaido / Tohoku',
  'Aomori':   'Hokkaido / Tohoku',
  'Iwate':    'Hokkaido / Tohoku',
  'Miyagi':   'Hokkaido / Tohoku',
  'Akita':    'Hokkaido / Tohoku',
  'Yamagata': 'Hokkaido / Tohoku',
  'Fukushima':'Hokkaido / Tohoku',

  // Kanto / Fuji
  'Tokyo':    'Kanto / Fuji',
  'Kanagawa': 'Kanto / Fuji',
  'Saitama':  'Kanto / Fuji',
  'Chiba':    'Kanto / Fuji',
  'Ibaraki':  'Kanto / Fuji',
  'Tochigi':  'Kanto / Fuji',
  'Gunma':    'Kanto / Fuji',
  'Yamanashi':'Kanto / Fuji',
  'Shizuoka': 'Kanto / Fuji',

  // Chubu / Hokuriku
  'Niigata':  'Chubu / Hokuriku',
  'Toyama':   'Chubu / Hokuriku',
  'Ishikawa': 'Chubu / Hokuriku',
  'Fukui':    'Chubu / Hokuriku',
  'Nagano':   'Chubu / Hokuriku',
  'Gifu':     'Chubu / Hokuriku',
  'Aichi':    'Chubu / Hokuriku',

  // Kansai
  'Kyoto':    'Kansai',
  'Osaka':    'Kansai',
  'Hyogo':    'Kansai',
  'Nara':     'Kansai',
  'Wakayama': 'Kansai',
  'Shiga':    'Kansai',
  'Mie':      'Kansai',

  // Chugoku / Shikoku
  'Tottori':  'Chugoku / Shikoku',
  'Shimane':  'Chugoku / Shikoku',
  'Okayama':  'Chugoku / Shikoku',
  'Hiroshima':'Chugoku / Shikoku',
  'Yamaguchi':'Chugoku / Shikoku',
  'Tokushima':'Chugoku / Shikoku',
  'Kagawa':   'Chugoku / Shikoku',
  'Ehime':    'Chugoku / Shikoku',
  'Kochi':    'Chugoku / Shikoku',

  // Kyushu / Okinawa
  'Fukuoka':  'Kyushu / Okinawa',
  'Saga':     'Kyushu / Okinawa',
  'Nagasaki': 'Kyushu / Okinawa',
  'Kumamoto': 'Kyushu / Okinawa',
  'Oita':     'Kyushu / Okinawa',
  'Miyazaki': 'Kyushu / Okinawa',
  'Kagoshima':'Kyushu / Okinawa',
  'Okinawa':  'Kyushu / Okinawa',
}

function extractRegion(races) {
  return races.map(race => {
    const match = race.location?.match(/\(([^)]+)\)/)
    const prefecture = match?.[1]?.trim() ?? null
    const region = prefecture ? (PREFECTURE_TO_REGION[prefecture] ?? null) : null
    return { ...race, region }
  })
}

export default extractRegion
