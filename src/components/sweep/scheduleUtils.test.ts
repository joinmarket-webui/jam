import { describe, expect, it } from 'vitest'
import {
  isScheduleLikelyCompletedSuccessfully,
  isScheduleValue,
  toScheduleProgressSummary,
  type Schedule,
} from './scheduleUtils'

describe('scheduleUtils', () => {
  it('identifies valid schedule values', () => {
    expect(isScheduleValue([[0, 0, 8, 'INTERNAL', 10, 16, 0]])).toBe(true)
    expect(isScheduleValue(undefined)).toBe(false)
    expect(isScheduleValue([{}])).toBe(false)
  })

  it('creates progress summary from schedule entries', () => {
    const schedule: Schedule = [
      [0, 0, 8, 'INTERNAL', 10, 16, 1],
      [1, 0, 8, 'INTERNAL', 5, 16, 0],
      [2, 0, 8, 'bc1qdestination', 1, 16, 0],
    ]

    const summary = toScheduleProgressSummary(schedule)

    expect(summary.totalTransactions).toBe(3)
    expect(summary.completedTransactions).toBe(1)
    expect(summary.currentTransactionIndex).toBe(1)
    expect(summary.isDone).toBe(false)
    expect(summary.steps).toHaveLength(3)
    expect(summary.steps[1].isActive).toBe(true)
  })

  it('falls back to frozen-utxo check when last schedule entry is stale', () => {
    const schedule: Schedule = [
      [0, 0, 8, 'INTERNAL', 10, 16, 1],
      [1, 0, 8, 'bc1qdestination', 0, 16, 0],
    ]

    expect(isScheduleLikelyCompletedSuccessfully(schedule, false)).toBe(false)
    expect(isScheduleLikelyCompletedSuccessfully(schedule, true)).toBe(true)
  })
})
