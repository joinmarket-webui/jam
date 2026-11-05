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
 * Parses a date-time string into a Date object.
 *
 * If the string lacks an explicit time zone designator, it is treated as UTC
 * (appending 'Z') to prevent ECMAScript engines from interpreting date-time
 * strings as local browser time.
 *
 * Returns `undefined` if the input is undefined, null, empty/whitespace,
 * or an unparsable/invalid date string.
 */
export const parseTimestamp = (value?: string | null): Date | undefined => {
  if (value === undefined || value === null) return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const timestamp = Date.parse(hasTimeZoneDesignator(trimmed) ? trimmed : `${trimmed}Z`)
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp)
}
