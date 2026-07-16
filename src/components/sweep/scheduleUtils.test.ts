import { describe, expect, it } from 'vitest'
import { isScheduleLikelyCompletedSuccessfully, toScheduleProgressSummary, type Schedule } from './scheduleUtils'

describe('scheduleUtils', () => {
  it('creates progress summary from schedule entries', () => {
    const schedule: Schedule = [
      {
        jarIndex: 0,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'INTERNAL',
        waitTimeInSeconds: 10 * 60,
        rounding: 16,
        stateFlag: 1,
      },
      {
        jarIndex: 1,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'INTERNAL',
        waitTimeInSeconds: 5 * 60,
        rounding: 16,
        stateFlag: 0,
      },
      {
        jarIndex: 2,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'bc1qdestination',
        waitTimeInSeconds: 1 * 60,
        rounding: 16,
        stateFlag: 0,
      },
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
      {
        jarIndex: 0,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'INTERNAL',
        waitTimeInSeconds: 10 * 60,
        rounding: 16,
        stateFlag: 1,
      },
      {
        jarIndex: 1,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'INTERNAL',
        waitTimeInSeconds: 5 * 60,
        rounding: 16,
        stateFlag: '8'.repeat(64),
      },
      {
        jarIndex: 2,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'bc1qdestination',
        waitTimeInSeconds: 1 * 60,
        rounding: 16,
        stateFlag: 0,
      },
    ]

    const summary = toScheduleProgressSummary(schedule)

    expect(summary.currentState?.type).toBe('waiting_for_confirmation')
    expect(summary.currentState?.currentTransaction).toBe(2)
    expect(summary.entries[1].state).toBe('broadcasted')
    expect(summary.entries[1].txid).toBe('8'.repeat(64))
  })

  it('derives current state while waiting before the next transaction', () => {
    const schedule: Schedule = [
      {
        jarIndex: 0,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'INTERNAL',
        waitTimeInSeconds: 2 * 60,
        rounding: 16,
        stateFlag: 1,
      },
      {
        jarIndex: 1,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'INTERNAL',
        waitTimeInSeconds: 0,
        rounding: 16,
        stateFlag: 0,
      },
    ]

    const summary = toScheduleProgressSummary(schedule)

    expect(summary.currentState?.type).toBe('waiting_before_next')
    expect(summary.currentState?.currentTransaction).toBe(2)
    expect(summary.currentState?.waitSeconds).toBe(120)
  })

  it('falls back to frozen-utxo check when last schedule entry is stale', () => {
    const schedule: Schedule = [
      {
        jarIndex: 0,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'INTERNAL',
        waitTimeInSeconds: 2 * 60,
        rounding: 16,
        stateFlag: 1,
      },
      {
        jarIndex: 1,
        amountFraction: 0,
        numberOfRequestedCounterparties: 8,
        destinationOrInternal: 'INTERNAL',
        waitTimeInSeconds: 0,
        rounding: 16,
        stateFlag: 0,
      },
    ]

    expect(isScheduleLikelyCompletedSuccessfully(schedule, false)).toBe(false)
    expect(isScheduleLikelyCompletedSuccessfully(schedule, true)).toBe(true)
  })
})
