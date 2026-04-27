import type { TumblerPhaseResponse, TumblerPlanResponse } from '@joinmarket-ng/joinmarket-ng-api-ts/jm'
import { describe, expect, it } from 'vitest'
import {
  isScheduleLikelyCompletedSuccessfully,
  isScheduleValue,
  toScheduleProgressSummary,
  type Schedule,
} from './scheduleUtils'

const phase = (index: number, overrides: Partial<TumblerPhaseResponse> = {}): TumblerPhaseResponse => ({
  kind: 'taker_coinjoin',
  index,
  status: 'pending',
  wait_seconds: 0,
  ...overrides,
})

const plan = (overrides: Partial<TumblerPlanResponse> = {}): Schedule => ({
  plan_id: 'plan-1',
  wallet_name: 'wallet.jmdat',
  status: 'running',
  destinations: ['bc1qdestination'],
  current_phase: 0,
  phases: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('scheduleUtils', () => {
  it('identifies valid schedule values', () => {
    expect(isScheduleValue(plan({ phases: [phase(0)] }))).toBe(true)
    expect(isScheduleValue(undefined)).toBe(false)
    expect(isScheduleValue(null)).toBe(false)
    expect(isScheduleValue({ plan_id: 'x' })).toBe(false)
    // legacy 7-tuple shape must no longer pass — drop-in shouldn't masquerade
    expect(isScheduleValue([[0, 0, 8, 'INTERNAL', 10, 16, 0]])).toBe(false)
  })

  it('creates progress summary from phases', () => {
    const schedule = plan({
      current_phase: 1,
      phases: [
        phase(0, { status: 'completed', wait_seconds: 600, txid: 'a'.repeat(64) }),
        phase(1, { status: 'pending', wait_seconds: 300 }),
        phase(2, { status: 'pending', wait_seconds: 60 }),
      ],
    })

    const summary = toScheduleProgressSummary(schedule)

    expect(summary.totalTransactions).toBe(3)
    expect(summary.completedTransactions).toBe(1)
    expect(summary.currentTransactionIndex).toBe(1)
    expect(summary.isDone).toBe(false)
    expect(summary.steps).toHaveLength(3)
    expect(summary.steps[0].isComplete).toBe(true)
    expect(summary.steps[1].isActive).toBe(true)
    expect(summary.entries).toHaveLength(3)
    expect(summary.entries[0].state).toBe('confirmed')
    expect(summary.entries[0].waitBeforeNextSeconds).toBe(600)
    expect(summary.entries[2].isLast).toBe(true)
  })

  it('derives current state while waiting for transaction confirmation', () => {
    const broadcastTxId = '8'.repeat(64)
    const schedule = plan({
      current_phase: 1,
      phases: [
        phase(0, { status: 'completed', wait_seconds: 600 }),
        phase(1, { status: 'running', wait_seconds: 300, txid: broadcastTxId }),
        phase(2, { status: 'pending', wait_seconds: 60 }),
      ],
    })

    const summary = toScheduleProgressSummary(schedule)

    expect(summary.currentState?.type).toBe('waiting_for_confirmation')
    expect(summary.currentState?.currentTransaction).toBe(2)
    expect(summary.entries[1].state).toBe('broadcasted')
    expect(summary.entries[1].txid).toBe(broadcastTxId)
  })

  it('derives current state while waiting before the next transaction', () => {
    const schedule = plan({
      current_phase: 1,
      phases: [
        phase(0, { status: 'completed', wait_seconds: 120 }),
        phase(1, { status: 'pending', wait_seconds: 0 }),
      ],
    })

    const summary = toScheduleProgressSummary(schedule)

    expect(summary.currentState?.type).toBe('waiting_before_next')
    expect(summary.currentState?.currentTransaction).toBe(2)
    expect(summary.currentState?.waitSeconds).toBe(120)
  })

  it('reports creating_and_broadcasting for a running phase without a txid', () => {
    const schedule = plan({
      current_phase: 0,
      phases: [phase(0, { status: 'running', wait_seconds: 0 })],
    })

    const summary = toScheduleProgressSummary(schedule)
    expect(summary.currentState?.type).toBe('creating_and_broadcasting')
  })

  it('marks the plan done when the runner reports a terminal status', () => {
    const schedule = plan({
      status: 'completed',
      current_phase: 1,
      phases: [
        phase(0, { status: 'completed' }),
        phase(1, { status: 'completed' }),
      ],
    })

    const summary = toScheduleProgressSummary(schedule)
    expect(summary.isDone).toBe(true)
    expect(summary.currentState).toBeUndefined()
  })

  it('treats completed plans as likely successful', () => {
    const schedule = plan({
      status: 'completed',
      phases: [phase(0, { status: 'completed' }), phase(1, { status: 'completed' })],
    })

    expect(isScheduleLikelyCompletedSuccessfully(schedule, false)).toBe(true)
  })

  it('falls back to the frozen-utxo check when only the last phase failed', () => {
    const schedule = plan({
      status: 'failed',
      phases: [
        phase(0, { status: 'completed' }),
        phase(1, { status: 'failed' }),
      ],
    })

    expect(isScheduleLikelyCompletedSuccessfully(schedule, false)).toBe(false)
    expect(isScheduleLikelyCompletedSuccessfully(schedule, true)).toBe(true)
  })

  it('does not claim success while the plan is still running', () => {
    const schedule = plan({
      status: 'running',
      phases: [phase(0, { status: 'completed' }), phase(1, { status: 'completed' })],
    })

    expect(isScheduleLikelyCompletedSuccessfully(schedule, true)).toBe(false)
  })
})
