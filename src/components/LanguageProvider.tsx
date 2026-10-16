'use client'

import { createContext, useContext, useSyncExternalStore } from 'react'
import { copy, type Lang } from '../app/dashboard/_lib/i18n'

type LanguageContextValue = { lang: Lang; setLang: (lang: Lang) => void; t: (typeof copy)[Lang] }
const LanguageContext = createContext<LanguageContextValue | null>(null)

function subscribeLanguage(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener('cw-language-change', onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener('cw-language-change', onChange)
  }
}

function savedLanguage(): Lang {
  return localStorage.getItem('cw_language') === 'zh' ? 'zh' : 'en'
}

// Match the server snapshot during hydration, then read the browser preference.
function serverLanguage(): Lang { return 'en' }

function decodeCopy(source: (typeof copy)[Lang]) {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16))) : value,
    ]),
  ) as (typeof copy)[Lang]
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const lang = useSyncExternalStore(subscribeLanguage, savedLanguage, serverLanguage)
  const setLang = (next: Lang) => {
    localStorage.setItem('cw_language', next)
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en'
    window.dispatchEvent(new Event('cw-language-change'))
  }
  return <LanguageContext.Provider value={{ lang, setLang, t: decodeCopy(copy[lang]) }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()
  return <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">{lang === 'en' ? '\u4e2d\u6587' : 'EN'}</button>
}
