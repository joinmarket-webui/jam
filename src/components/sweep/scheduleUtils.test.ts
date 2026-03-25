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
    expect(summary.entries).toHaveLength(3)
    expect(summary.entries[0].state).toBe('confirmed')
    expect(summary.entries[0].waitBeforeNextSeconds).toBe(600)
    expect(summary.entries[2].isLast).toBe(true)
  })

  it('derives current state while waiting for transaction confirmation', () => {
    const schedule: Schedule = [
      [0, 0, 8, 'INTERNAL', 10, 16, 1],
      [1, 0, 8, 'INTERNAL', 5, 16, '8'.repeat(64)],
      [2, 0, 8, 'bc1qdestination', 1, 16, 0],
    ]

    const summary = toScheduleProgressSummary(schedule)

    expect(summary.currentState?.type).toBe('waiting_for_confirmation')
    expect(summary.currentState?.currentTransaction).toBe(2)
    expect(summary.entries[1].state).toBe('broadcasted')
    expect(summary.entries[1].txid).toBe('8'.repeat(64))
  })

  it('derives current state while waiting before the next transaction', () => {
    const schedule: Schedule = [
      [0, 0, 8, 'INTERNAL', 2, 16, 1],
      [1, 0, 8, 'bc1qdestination', 0, 16, 0],
    ]

    const summary = toScheduleProgressSummary(schedule)

    expect(summary.currentState?.type).toBe('waiting_before_next')
    expect(summary.currentState?.currentTransaction).toBe(2)
    expect(summary.currentState?.waitSeconds).toBe(120)
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
