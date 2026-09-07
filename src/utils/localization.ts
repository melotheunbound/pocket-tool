// thanks to @mwyeow

import { readFileSync } from 'fs'
import { join } from 'path'

const localesPath = join(process.cwd(), 'locales')
const fallback = 'en'
const supportedLanguages = ['en', 'pt'] as const

type SupportedLanguage = (typeof supportedLanguages)[number]
type TranslationCatalog = Record<string, unknown>

const catalogs: Record<SupportedLanguage, TranslationCatalog> = {
  en: loadLocale('en'),
  pt: loadLocale('pt'),
}

function loadLocale(locale: SupportedLanguage): TranslationCatalog {
  const path = join(localesPath, `${locale}.json`)

  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    throw new Error(`Translation file not found or invalid: ${path}`)
  }
}

export function t(locale: string | undefined, key: string, variables: Record<string, string | number> = {}): string {
  const shortLocale = locale?.split('-')[0]?.toLowerCase()

  const finalLocale: SupportedLanguage = supportedLanguages.includes(shortLocale as SupportedLanguage)
    ? (shortLocale as SupportedLanguage)
    : fallback

  const keys = key.split('.')

  let translation = resolve(catalogs[finalLocale], keys)

  if (typeof translation !== 'string') {
    translation = resolve(catalogs[fallback], keys)

    if (typeof translation !== 'string') return key
  }

  return interpolate(translation, variables)
}

function resolve(catalog: TranslationCatalog, keys: string[]): unknown {
  let current: unknown = catalog

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as TranslationCatalog)[key]
    } else {
      return undefined
    }
  }

  return current
}

function interpolate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    return key in variables ? String(variables[key]) : `{${key}}`
  })
}
