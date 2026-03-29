import type { TxId } from '@/store/jmTxStore'
import type { BitcoinAddress, JarIndex, Minutes } from '@/types/global'

type AmountFraction = number
type AmountCounterparties = number
type SchedulerDestinationAddress = 'INTERNAL' | BitcoinAddress
type WaitTimeInMinutes = Minutes
type Rounding = number
type StateFlag = 0 | 1 | TxId

// [mixdepth, amount-fraction, N-counterparties (requested), destination address, wait time in minutes, rounding, flag indicating incomplete/broadcast/completed (0/txid/1)]
// e.g.
// - [ 2, 0.2456498211214867, 4, "INTERNAL", 0.01, 16, 1 ]
// - [ 3, 0, 8, "bcrt1qpnv3nze7u6ecw63mn06ksxh497a3lryagh233q", 0.04, 16, 0 ]
export type ScheduleEntry = [
  JarIndex,
  AmountFraction,
  AmountCounterparties,
  SchedulerDestinationAddress,
  WaitTimeInMinutes,
  Rounding,
  StateFlag,
]

export type Schedule = ScheduleEntry[]

export interface ScheduleProgressStep {
  widthPercent: number
  isComplete: boolean
  isActive: boolean
  isFirst: boolean
  isLast: boolean
}

export type ScheduleEntryState = 'pending' | 'broadcasted' | 'confirmed'

export interface ScheduleProgressEntry {
  index: number
  waitBeforeNextSeconds: number
  state: ScheduleEntryState
  txid?: TxId
  isLast: boolean
}

export type ScheduleCurrentStateType =
  | 'waiting_before_next'
  | 'creating_and_broadcasting'
  | 'waiting_for_confirmation'
  | 'transaction_confirmed'

export interface ScheduleCurrentState {
  type: ScheduleCurrentStateType
  currentTransaction: number
  totalTransactions: number
  waitSeconds?: number
  txid?: TxId
}

export interface ScheduleProgressSummary {
  totalWaitSeconds: number
  totalTransactions: number
  completedTransactions: number
  currentTransactionIndex: number
  isDone: boolean
  steps: ScheduleProgressStep[]
  entries: ScheduleProgressEntry[]
  currentState?: ScheduleCurrentState
}

const MIN_STEP_WIDTH_PERCENT = 8

const toNumberOrDefault = (value: unknown, fallback: number): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

const getScheduleEntryWaitMinutes = (entry: ScheduleEntry): number => {
  return Math.max(0, toNumberOrDefault(entry[4], 0))
}

const getScheduleEntryState = (entry: ScheduleEntry): string | number => {
  return entry[6] ?? 0
}

const getScheduleEntryTxId = (entry: ScheduleEntry): TxId | undefined => {
  const state = getScheduleEntryState(entry)
  return typeof state === 'string' ? state : undefined
}

// Scheduler state flag convention from backend:
// 0 => not yet broadcast, txid string => broadcasted (unconfirmed), 1 => confirmed.
const toScheduleEntryState = (entry: ScheduleEntry): ScheduleEntryState => {
  const state = getScheduleEntryState(entry)

  if (state === 1) {
    return 'confirmed'
  }
  if (typeof state === 'string') {
    return 'broadcasted'
  }
  return 'pending'
}

const isScheduleEntryConfirmed = (entry: ScheduleEntry): boolean => {
  return getScheduleEntryState(entry) === 1
}

export const isScheduleEntrySuccessful = (entry: ScheduleEntry): boolean => {
  const state = getScheduleEntryState(entry)
  return state === 1 || typeof state === 'string'
}

export const isScheduleValue = (value: unknown): value is Schedule => {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length >= 7 &&
        typeof entry[0] === 'number' /* JarIndex */ &&
        typeof entry[1] === 'number' /* AmountFraction */ &&
        typeof entry[2] === 'number' /* AmountCounterparties */ &&
        typeof entry[3] === 'string' /* SchedulerDestinationAddress */ &&
        typeof entry[4] === 'number' /* WaitTimeInMinutes */ &&
        typeof entry[5] === 'number' /* Rounding */ &&
        (typeof entry[6] === 'number' || typeof entry[6] === 'string') /* StateFlag */,
    )
  )
}

export const toScheduleProgressSummary = (schedule: Schedule): ScheduleProgressSummary => {
  if (schedule.length === 0) {
    return {
      totalWaitSeconds: 0,
      totalTransactions: 0,
      completedTransactions: 0,
      currentTransactionIndex: 0,
      isDone: true,
      steps: [],
      entries: [],
    }
  }

  const completedTransactions = schedule.reduce((acc, entry) => {
    return acc + (isScheduleEntryConfirmed(entry) ? 1 : 0)
  }, 0)

  const totalWaitSeconds = Math.max(
    1,
    schedule.slice(0, Math.max(0, schedule.length - 1)).reduce((acc, entry) => {
      return acc + getScheduleEntryWaitMinutes(entry) * 60
    }, 0),
  )

  const isDone = completedTransactions >= schedule.length
  const currentTransactionIndex = Math.min(completedTransactions, schedule.length - 1)

  const steps: ScheduleProgressStep[] = schedule.map((_entry, index) => {
    const widthPercent =
      index === 0
        ? MIN_STEP_WIDTH_PERCENT
        : Math.max(
            MIN_STEP_WIDTH_PERCENT,
            ((Math.max(1, getScheduleEntryWaitMinutes(schedule[index - 1])) * 60) / totalWaitSeconds) * 100,
          )

    return {
      widthPercent,
      isComplete: completedTransactions > index,
      isActive: !isDone && completedTransactions === index,
      isFirst: index === 0,
      isLast: index === schedule.length - 1,
    }
  })

  const entries: ScheduleProgressEntry[] = schedule.map((entry, index) => {
    return {
      index,
      waitBeforeNextSeconds: index >= schedule.length - 1 ? 0 : getScheduleEntryWaitMinutes(entry) * 60,
      state: toScheduleEntryState(entry),
      txid: getScheduleEntryTxId(entry),
      isLast: index === schedule.length - 1,
    }
  })

  let currentState: ScheduleCurrentState | undefined
  if (!isDone) {
    const activeEntry = schedule[currentTransactionIndex]
    const activeEntryTxId = getScheduleEntryTxId(activeEntry)
    const activeEntryState = getScheduleEntryState(activeEntry)

    // Infer the user-facing phase from the currently active entry and the previous wait slot.
    if (activeEntryTxId !== undefined) {
      currentState = {
        type: 'waiting_for_confirmation',
        currentTransaction: currentTransactionIndex + 1,
        totalTransactions: schedule.length,
        txid: activeEntryTxId,
      }
    } else if (activeEntryState === 1) {
      currentState = {
        type: 'transaction_confirmed',
        currentTransaction: currentTransactionIndex + 1,
        totalTransactions: schedule.length,
      }
    } else {
      const waitSeconds =
        currentTransactionIndex > 0
          ? Math.ceil(getScheduleEntryWaitMinutes(schedule[currentTransactionIndex - 1]) * 60)
          : 0

      currentState =
        waitSeconds > 0
          ? {
              type: 'waiting_before_next',
              currentTransaction: currentTransactionIndex + 1,
              totalTransactions: schedule.length,
              waitSeconds,
            }
          : {
              type: 'creating_and_broadcasting',
              currentTransaction: currentTransactionIndex + 1,
              totalTransactions: schedule.length,
            }
    }
  }

  return {
    totalWaitSeconds,
    totalTransactions: schedule.length,
    completedTransactions: Math.min(completedTransactions, schedule.length),
    currentTransactionIndex,
    isDone,
    steps,
    entries,
    currentState,
  }
}

export const isScheduleLikelyCompletedSuccessfully = (schedule: Schedule, allUtxosFrozen: boolean): boolean => {
  if (schedule.length === 0) {
    return false
  }

  const entriesBeforeLastSucceeded = schedule.slice(0, -1).every((entry) => isScheduleEntrySuccessful(entry))
  const lastEntry = schedule.at(-1)
  if (lastEntry === undefined) {
    return false
  }

  const lastEntrySucceeded = isScheduleEntrySuccessful(lastEntry)

  return entriesBeforeLastSucceeded && (lastEntrySucceeded || allUtxosFrozen)
}
