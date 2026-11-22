/**
 * Checks whether a date-time string has an explicit time zone designator
 * (such as 'Z', '+00:00', '-05:00', '+0530', 'GMT', or 'UTC').
 */
export const hasTimeZoneDesignator = (value: string): boolean => /(Z|[+-]\d{2}:?\d{2}|GMT|UTC)$/i.test(value.trim())

/**
 * Returns true if value is a Date instance that represents a valid date.
 */
export const isValidDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime())

/**
 * Normalizes non-standard date-time strings to ISO 8601 format:
 * - Converts slash separators (YYYY/MM/DD) to hyphens (YYYY-MM-DD)
 * - Converts space separator between date and time to 'T'
 * - Normalizes trailing 'GMT' or 'UTC' indicators to 'Z'
 */
export const normalizeTimestamp = (value: string): string => {
  let s = value.trim()
  s = s.replace(/^(\d{4})\/(\d{2})\/(\d{2})/, '$1-$2-$3')
  s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)/, '$1T$2')
  s = s.replace(/\s*(?:GMT|UTC|Z)$/i, 'Z')
  return s
}

/**
 * Parses a date-time string into a Date object.
 *
 * If the string lacks an explicit time zone designator, it is treated as UTC
 * (appending 'Z') to prevent ECMAScript engines from interpreting date-time
 * strings as local browser time. Non-standard timestamp formats (such as
 * 'YYYY/MM/DD HH:mm:ss' or trailing 'GMT'/'UTC') are normalized to standard
 * ISO 8601 ('YYYY-MM-DDTHH:mm:ssZ') to ensure consistent cross-browser parsing
 * across V8, WebKit (Safari), and SpiderMonkey (Firefox).
 *
 * Returns `undefined` if the input is undefined, null, empty/whitespace,
 * or an unparsable/invalid date string.
 */
export const parseTimestamp = (value?: string | null): Date | undefined => {
  if (value === undefined || value === null) return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const normalized = normalizeTimestamp(trimmed)
  const timestamp = Date.parse(hasTimeZoneDesignator(normalized) ? normalized : `${normalized}Z`)
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp)
}
