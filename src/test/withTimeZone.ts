/**
 * Runs `callback` with the process time zone set to `timeZone`, so that
 * `Date` methods without an explicit `timeZone` use it instead of the host
 * machine's zone. This keeps time-zone-dependent assertions meaningful on
 * machines and CI runners that are on UTC.
 *
 * Deleting `process.env.TZ` does not reset Node.js to the system time zone,
 * so the original zone is set explicitly before `TZ` is restored.
 */
export function withTimeZone(timeZone: string, callback: () => Promise<void>): Promise<void>
export function withTimeZone(timeZone: string, callback: () => void): void
export function withTimeZone(timeZone: string, callback: () => void | Promise<void>): void | Promise<void> {
  const originalTz = process.env.TZ
  const originalTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  process.env.TZ = timeZone

  const restore = () => {
    process.env.TZ = originalTimeZone
    if (originalTz === undefined) {
      delete process.env.TZ
    } else {
      process.env.TZ = originalTz
    }
  }

  let result: void | Promise<void>
  try {
    result = callback()
  } catch (error) {
    restore()
    throw error
  }

  if (result instanceof Promise) {
    return result.finally(restore)
  }

  restore()
  return undefined
}
