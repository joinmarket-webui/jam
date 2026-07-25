import { describe, expect, it } from 'vitest'
import { generateLockdateOptions } from './types'

describe('generateLockdateOptions', () => {
  it.each([false, true])('generates well-formed, ordered YYYY-MM values (developer mode: %s)', (isDeveloperMode) => {
    const values = generateLockdateOptions(isDeveloperMode).map((option) => option.value)

    for (const value of values) {
      expect(value).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
    }
    // zero-padded YYYY-MM sorts lexicographically === chronologically
    expect(values.toSorted()).toEqual(values)
  })

  it('includes the past 12 months in developer mode', () => {
    const values = generateLockdateOptions(true).map((option) => option.value)
    const now = new Date()
    const oneYearAgo = `${now.getUTCFullYear() - 1}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    expect(values[0]).toBe(oneYearAgo)
    expect(values).toHaveLength(133) // -12 .. +120 months
  })
})
