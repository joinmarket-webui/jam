import { describe, expect, it } from 'vitest'
import { withTimeZone } from './withTimeZone'

// A winter date, so the offsets below are free of daylight saving time.
const JAN_2027 = Date.UTC(2027, 0, 1)

// Taken before any test runs, so a leak from one test cannot hide in the next.
const ORIGINAL_OFFSET = new Date(JAN_2027).getTimezoneOffset()
const ORIGINAL_TZ = process.env.TZ

describe('withTimeZone', () => {
  it('runs the callback in the given time zone and restores the original one', () => {
    withTimeZone('America/New_York', () => {
      expect(new Date(JAN_2027).getTimezoneOffset()).toBe(300)
    })

    expect(new Date(JAN_2027).getTimezoneOffset()).toBe(ORIGINAL_OFFSET)
    expect(process.env.TZ).toBe(ORIGINAL_TZ)
  })

  it('restores the original time zone when the callback throws', () => {
    expect(() =>
      withTimeZone('America/New_York', () => {
        throw new Error('boom')
      }),
    ).toThrow('boom')

    expect(new Date(JAN_2027).getTimezoneOffset()).toBe(ORIGINAL_OFFSET)
  })

  it('restores the original time zone after an async callback', async () => {
    await withTimeZone('America/Los_Angeles', async () => {
      await Promise.resolve()
      expect(new Date(JAN_2027).getTimezoneOffset()).toBe(480)
    })

    expect(new Date(JAN_2027).getTimezoneOffset()).toBe(ORIGINAL_OFFSET)
  })
})
