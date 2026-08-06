'use client'

import { createContext, useContext, useState } from 'react'
import { copy, type Lang } from '../app/dashboard/_lib/i18n'

type LanguageContextValue = { lang: Lang; setLang: (lang: Lang) => void; t: (typeof copy)[Lang] }
const LanguageContext = createContext<LanguageContextValue | null>(null)

function decodeCopy(source: (typeof copy)[Lang]) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16))) : value,
    ]),
  ) as (typeof copy)[Lang]
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en'
    const saved = localStorage.getItem('cw_language')
    return saved === 'zh' ? 'zh' : 'en'
  })
  const setLang = (next: Lang) => {
    setLangState(next)
    localStorage.setItem('cw_language', next)
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
  }
  return <LanguageContext.Provider value={{ lang, setLang, t: decodeCopy(copy[lang]) }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage()
  return <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">{t.language}</button>
}
