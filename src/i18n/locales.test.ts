import { describe, expect, it } from 'vitest'
import languages from './languages'

type TranslationTree = { [key: string]: string | TranslationTree }

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/
const NESTED_KEY = /\$t\(([\w.^-]+)/g
const INTERPOLATION = /\{\{\s*([\w.]+)[^}]*\}\}/g

const flatten = (tree: TranslationTree, prefix = '', result: Record<string, string> = {}) => {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'string') {
      result[path] = value
    } else {
      flatten(value, path, result)
    }
  }
  return result
}

const withoutPluralSuffix = (key: string) => key.replace(PLURAL_SUFFIX, '')

const variablesOf = (value: string) => [...value.matchAll(INTERPOLATION)].map((match) => match[1])

const en = flatten(languages.find((it) => it.key === 'en')!.translation)
const enBaseKeys = new Set(Object.keys(en).map((key) => withoutPluralSuffix(key)))

// all interpolation variables per (plural-less) key, as languages differ in their plural forms
const enVariables = Object.entries(en).reduce<Record<string, Set<string>>>((acc, [key, value]) => {
  const baseKey = withoutPluralSuffix(key)
  acc[baseKey] ??= new Set(['count'])
  variablesOf(value).forEach((it) => acc[baseKey].add(it))
  return acc
}, {})

const translated = languages
  .filter((it) => it.key !== 'en')
  .map((it) => [it.key, flatten(it.translation as TranslationTree)] as const)

describe('translations', () => {
  it.each([['en', en] as const, ...translated])('%s: nested $t() references resolve', (_, translation) => {
    const unresolved = Object.values(translation)
      .flatMap((value) => [...value.matchAll(NESTED_KEY)].map((match) => match[1]))
      .filter((key) => !enBaseKeys.has(key))

    expect(unresolved).toEqual([])
  })

  it.each(translated)('%s: contains no keys missing in the source language', (_, translation) => {
    const orphans = Object.keys(translation).filter((key) => !enBaseKeys.has(withoutPluralSuffix(key)))

    expect(orphans).toEqual([])
  })

  it.each(translated)('%s: uses only interpolation variables known to the source language', (_, translation) => {
    const unknown = Object.entries(translation).flatMap(([key, value]) => {
      const known = enVariables[withoutPluralSuffix(key)] ?? new Set<string>()
      return variablesOf(value)
        .filter((it) => !known.has(it))
        .map((it) => `${key}: {{ ${it} }}`)
    })

    expect(unknown).toEqual([])
  })
})
