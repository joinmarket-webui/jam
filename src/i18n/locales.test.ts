import { describe, expect, it } from 'vitest'
import languages from './languages'

type TranslationTree = { [key: string]: string | TranslationTree }

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/
const NESTED_KEY = /\$t\(([\w.^-]+)/g
const INTERPOLATION = /\{\{\s*([\w.]+)[^}]*\}\}/g
const COMPONENT = /<\/?\d+\s*\/?>/g

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

// `<Trans>` component placeholders like `<0>`, `</0>` or `<1/>`, in a comparable order
const componentsOf = (value: string) =>
  [...value.matchAll(COMPONENT)]
    .map((match) => match[0].replaceAll(/\s/g, ''))
    .toSorted()
    .join(' ')

const en = flatten(languages.find((it) => it.key === 'en')!.translation)
const enBaseKeys = new Set(Object.keys(en).map((key) => withoutPluralSuffix(key)))

// all interpolation variables per (plural-less) key, as languages differ in their plural forms
const enVariables = Object.entries(en).reduce<Record<string, Set<string>>>((acc, [key, value]) => {
  const baseKey = withoutPluralSuffix(key)
  acc[baseKey] ??= new Set(['count'])
  variablesOf(value).forEach((it) => acc[baseKey].add(it))
  return acc
}, {})

// the source string a translated key is compared to; plural forms en does not have are compared to `_other`
const sourceOf = (key: string): string | undefined =>
  en[key] ?? (PLURAL_SUFFIX.test(key) ? en[`${withoutPluralSuffix(key)}_other`] : undefined)

const isPluralOf = (key: string, baseKey: string) => PLURAL_SUFFIX.test(key) && withoutPluralSuffix(key) === baseKey

// plural keys en itself translates in more than one form (keys with only `_other` are not used as plurals)
const enPluralBaseKeys = Object.keys(en)
  .filter((key) => PLURAL_SUFFIX.test(key))
  .map((key) => withoutPluralSuffix(key))
  .filter((baseKey, index, all) => all.indexOf(baseKey) !== index)

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

  it.each(translated)('%s: keeps all interpolation variables of the source language', (_, translation) => {
    const dropped = Object.entries(translation).flatMap(([key, value]) => {
      const source = sourceOf(key)
      if (source === undefined) return []
      const present = new Set(variablesOf(value))
      // `count` is optional, e.g. "one entry" instead of "{{ count }} entry"
      return variablesOf(source)
        .filter((it) => it !== 'count' && !present.has(it))
        .map((it) => `${key}: {{ ${it} }}`)
    })

    expect(dropped).toEqual([])
  })

  it.each(translated)('%s: uses the same components as the source language', (_, translation) => {
    const mismatched = Object.entries(translation)
      .filter(([key, value]) => {
        const source = sourceOf(key)
        return source !== undefined && componentsOf(source) !== componentsOf(value)
      })
      .map(([key]) => key)

    expect(mismatched).toEqual([])
  })

  it.each(translated)('%s: contains every plural form the language needs', (lng, translation) => {
    const categories = new Intl.PluralRules(lng).resolvedOptions().pluralCategories
    const missing = [...new Set(enPluralBaseKeys)]
      .filter((baseKey) => Object.keys(translation).some((key) => isPluralOf(key, baseKey)))
      .flatMap((baseKey) =>
        categories.filter((it) => translation[`${baseKey}_${it}`] === undefined).map((it) => `${baseKey}_${it}`),
      )

    expect(missing).toEqual([])
  })
})
