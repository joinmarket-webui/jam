/* eslint-disable unicorn/no-process-exit */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDirectory = path.resolve(__dirname, '..')
const localesDirectory = path.join(rootDirectory, 'src', 'i18n', 'locales')
const enFilePath = path.join(localesDirectory, 'en', 'translation.json')

/**
 * Flattens a nested translation object into dot-notated key-value pairs.
 */
function flattenKeys(object, prefix = '') {
  const result = {}
  for (const [key, value] of Object.entries(object)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullKey))
    } else {
      result[fullKey] = value
    }
  }
  return result
}

/**
 * Recursively find all source code files in a directory.
 */
function getSourceFiles(directory, extensions = ['.ts', '.tsx', '.js', '.jsx', '.html']) {
  let files = []
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (['locales', 'node_modules', 'dist'].includes(entry.name)) {
        continue
      }
      files = [...files, ...getSourceFiles(fullPath, extensions)]
    } else if (extensions.some((extension) => entry.name.endsWith(extension))) {
      files.push(fullPath)
    }
  }
  return files
}

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other']

function getPluralBase(key) {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) {
      return key.slice(0, -suffix.length)
    }
  }
  return null
}

function runCheck() {
  console.log('🔍 Checking i18n translation keys...')

  if (!fs.existsSync(enFilePath)) {
    console.error(`❌ English translation file not found at: ${enFilePath}`)
    process.exit(1)
  }

  const enRaw = fs.readFileSync(enFilePath, 'utf8')
  const enJson = JSON.parse(enRaw)
  const enKeysMap = flattenKeys(enJson)
  const allEnKeys = new Set(Object.keys(enKeysMap))

  // Collect all source code content
  const sourceFiles = getSourceFiles(path.join(rootDirectory, 'src'))
  const sourceContents = sourceFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n')

  const referencedKeys = new Set()

  // 1. Dynamic patterns used across the application
  const DYNAMIC_PREFIXES = [
    // Password verification form prefixing
    'settings.seed_modal.verification.',
    'settings.xpubs_modal.verification.',
    // Precondition alert prefixing
    'send.coinjoin_precondition.',
    'scheduler.precondition.',
    // Status badges and labels
    'scheduler.status_',
    'tx_history.label_role_',
    'jar_details.utxo_list.utxo_tag_tooltip_',
  ]

  for (const key of allEnKeys) {
    if (DYNAMIC_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      referencedKeys.add(key)
    }
  }

  // 2. Direct references in source files
  for (const key of allEnKeys) {
    if (referencedKeys.has(key)) continue

    if (sourceContents.includes(key)) {
      referencedKeys.add(key)
      continue
    }

    const pluralBase = getPluralBase(key)
    if (pluralBase && sourceContents.includes(pluralBase)) {
      referencedKeys.add(key)
    }
  }

  // 3. Resolve transitive $t(...) nesting in translation strings
  let addedNew = true
  while (addedNew) {
    addedNew = false
    for (const key of referencedKeys) {
      const value = enKeysMap[key]
      if (typeof value === 'string' && value.includes('$t(')) {
        const matches = value.matchAll(/\$t\(([\w.-]+)/g)
        for (const match of matches) {
          const targetKey = match[1]
          if (allEnKeys.has(targetKey) && !referencedKeys.has(targetKey)) {
            referencedKeys.add(targetKey)
            addedNew = true
          }
          // Plural variants
          for (const suffix of ['_one', '_other', '_few', '_many']) {
            const variantKey = `${targetKey}${suffix}`
            if (allEnKeys.has(variantKey) && !referencedKeys.has(variantKey)) {
              referencedKeys.add(variantKey)
              addedNew = true
            }
          }
        }
      }
    }
  }

  // 4. Find dead / unused keys in EN
  const deadKeys = [...allEnKeys].filter((k) => !referencedKeys.has(k)).toSorted()

  // 5. Check orphaned keys in other locales
  const otherLocales = fs
    .readdirSync(localesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== 'en')
    .map((entry) => entry.name)

  const orphanedByLocale = {}

  for (const locale of otherLocales) {
    const localePath = path.join(localesDirectory, locale, 'translation.json')
    if (!fs.existsSync(localePath)) continue

    const localeJson = JSON.parse(fs.readFileSync(localePath, 'utf8'))
    const localeKeys = Object.keys(flattenKeys(localeJson))

    const orphaned = localeKeys.filter((key) => {
      if (allEnKeys.has(key)) return false
      // Check if it's a valid locale-specific plural form of an existing EN key
      const pluralBase = getPluralBase(key)
      if (pluralBase && (allEnKeys.has(`${pluralBase}_one`) || allEnKeys.has(`${pluralBase}_other`))) {
        return false
      }
      return true
    })

    if (orphaned.length > 0) {
      orphanedByLocale[locale] = orphaned.toSorted()
    }
  }

  // Report results
  let hasErrors = false

  if (deadKeys.length > 0) {
    hasErrors = true
    console.error(`\n❌ Found ${deadKeys.length} dead/unreferenced key(s) in en/translation.json:`)
    for (const k of deadKeys) {
      console.error(`  - ${k}`)
    }
  } else {
    console.log(`\n✅ en/translation.json: all ${allEnKeys.size} keys are active and referenced.`)
  }

  const orphanedLocaleCount = Object.keys(orphanedByLocale).length
  if (orphanedLocaleCount > 0) {
    hasErrors = true
    console.error(`\n❌ Found orphaned keys in ${orphanedLocaleCount} locale(s):`)
    for (const [locale, keys] of Object.entries(orphanedByLocale)) {
      console.error(`  [${locale}] (${keys.length} keys):`)
      for (const k of keys) {
        console.error(`    - ${k}`)
      }
    }
  } else {
    console.log(`✅ All ${otherLocales.length} non-English locales are in sync with en source (no orphaned keys).`)
  }

  if (hasErrors) {
    process.exit(1)
  }

  console.log('\n✨ i18n validation passed successfully!\n')
}

runCheck()
