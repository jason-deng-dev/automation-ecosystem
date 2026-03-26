import { useState } from 'react'

export default function useLang() {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh')

  function toggleLang() {
    const next = lang === 'zh' ? 'en' : 'zh'
    localStorage.setItem('lang', next)
    setLang(next)
  }

  return [lang, toggleLang]
}
