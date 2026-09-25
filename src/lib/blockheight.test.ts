import { describe, expect, it } from 'vitest'
import {
  BITCOIN_CHECKPOINTS,
  BITCOIN_GENESIS_YEAR,
  estimateBlockheightFromDate,
  getAvailableYearOptions,
  getMonthOptions,
} from './blockheight'

describe('blockheight estimation', () => {
  describe('estimateBlockheightFromDate', () => {
    it('returns 0 for Bitcoin Genesis month (Jan 2009) or earlier', () => {
      expect(estimateBlockheightFromDate({ year: 2008, month: 12 })).toBe(0)
      expect(estimateBlockheightFromDate({ year: 2009, month: 1 })).toBe(0)
      expect(estimateBlockheightFromDate({ year: 1999, month: 5 })).toBe(0)
    })

    it('returns 0 when 1-month safety buffer pushes into or before Jan 2009', () => {
      // Feb 2009 with 1-month safety buffer targets Jan 2009 -> Genesis (0)
      expect(estimateBlockheightFromDate({ year: 2009, month: 2, safetyBufferMonths: 1 })).toBe(0)
    })

    it('estimates blockheight within expected ranges for historical dates', () => {
      // Mid 2014 (between Halving 1 in Nov 2012 at 210,000 and Halving 2 in Jul 2016 at 420,000)
      const height2014 = estimateBlockheightFromDate({ year: 2014, month: 6 })
      expect(height2014).toBeGreaterThan(210_000)
      expect(height2014).toBeLessThan(420_000)

      // Late 2021 (around Taproot activation Nov 2021 at 709,632)
      const height2021 = estimateBlockheightFromDate({ year: 2021, month: 12 })
      expect(height2021).toBeGreaterThan(650_000)
      expect(height2021).toBeLessThan(750_000)
    })

    it('clamps estimated blockheight to currentBlockHeight if specified', () => {
      const currentBlockHeight = 500_000
      const estimated = estimateBlockheightFromDate({
        year: 2024,
        month: 1,
        currentBlockHeight,
      })
      expect(estimated).toBe(currentBlockHeight)
    })

    it('shifts target date back by the safety buffer', () => {
      const heightWithBuffer = estimateBlockheightFromDate({ year: 2023, month: 6, safetyBufferMonths: 1 })
      const heightWithoutBuffer = estimateBlockheightFromDate({ year: 2023, month: 6, safetyBufferMonths: 0 })
      expect(heightWithoutBuffer).toBeGreaterThan(heightWithBuffer)
    })

    it('extrapolates forward for dates past the latest checkpoint', () => {
      const lastCheckpoint = BITCOIN_CHECKPOINTS.at(-1)!
      const height = estimateBlockheightFromDate({ year: 2026, month: 9, safetyBufferMonths: 0 })
      expect(height).toBeGreaterThan(lastCheckpoint.height)
    })
  })

  describe('getAvailableYearOptions', () => {
    it('returns descending years from current year down to 2009', () => {
      const years = getAvailableYearOptions(2026)
      expect(years[0]).toEqual({ value: '2026', label: '2026' })
      expect(years.at(-1)).toEqual({ value: '2009', label: '2009' })
      expect(years.length).toBe(2026 - BITCOIN_GENESIS_YEAR + 1)
    })
  })

  describe('getMonthOptions', () => {
    it('returns 12 months with 2-digit values', () => {
      const months = getMonthOptions()
      expect(months).toHaveLength(12)
      expect(months[0].value).toBe('01')
      expect(months.at(-1)?.value).toBe('12')
    })
  })
})
