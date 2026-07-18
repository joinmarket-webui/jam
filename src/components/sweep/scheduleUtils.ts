import type { TumblerPhaseResponse, TumblerPlanResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import type { TFunction } from 'i18next'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { TxId } from '@/store/jmTxStore'
import type { BitcoinAddress, JarIndex, Seconds } from '@/types/global'

type AmountCounterparties = number
type StateFlag = 0 | 1 | TxId // flag indicating incomplete/broadcast/completed (0/txid/1)

export type TakerEntryDetails = {
  jarIndex: JarIndex
  jar?: Jar
  amountFraction?: number
  numberOfRequestedCounterparties: AmountCounterparties // N-counterparties (requested)
} & (
  | {
      internal: true
      externalDestinationAddress: undefined
    }
  | {
      internal: false
      externalDestinationAddress: BitcoinAddress
    }
)

export type MakerEntryDetails = {
  durationSeconds: Seconds
  idleTimeoutSeconds: Seconds
}

export type ScheduleEntry = {
  kind: 'taker_coinjoin' | 'maker_session' | TumblerPhaseResponse['kind']
  startedAt?: Date
  finishedAt?: Date
  waitTimeInSeconds: Seconds
  stateFlag: StateFlag // TODO: replace
  __raw?: TumblerPhaseResponse // TODO: not optional
} & Partial<TakerEntryDetails> &
  Partial<MakerEntryDetails>

// TODO: refactor to object with summary props
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
  step: ScheduleProgressStep
  __raw: ScheduleEntry
}

export type ScheduleCurrentStateType =
  'waiting_before_next' | 'creating_and_broadcasting' | 'waiting_for_confirmation' | 'transaction_confirmed'

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
  entries: ScheduleProgressEntry[]
  currentState?: ScheduleCurrentState
}

const FIRST_STEP_WIDTH_PERCENT = 5
const MIN_STEP_WIDTH_PERCENT = 3

const getScheduleEntryState = (entry: ScheduleEntry): string | number => {
  return entry.stateFlag ?? 0
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

const isPhaseComplete = (phase: TumblerPhaseResponse): boolean => {
  return phase.status.toLowerCase() === 'completed'
}

const toScheduleStateFlag = (phase: TumblerPhaseResponse): ScheduleEntry['stateFlag'] => {
  if (isPhaseComplete(phase)) {
    return 1
  }
  return phase.txid ?? 0
}

export const toSchedule = (plan: TumblerPlanResponse, jars: Jar[]): Schedule => {
  return plan.phases.map((it) => toScheduleEntry(it, jars))
}

export const toScheduleEntry = (phase: TumblerPhaseResponse, jars: Jar[]): ScheduleEntry => {
  let value: ScheduleEntry = {
    kind: phase.kind,
    startedAt: phase.started_at ? new Date(Date.parse(phase.started_at)) : undefined,
    finishedAt: phase.finished_at ? new Date(Date.parse(phase.finished_at)) : undefined,
    waitTimeInSeconds: phase.wait_seconds ?? 0,
    stateFlag: toScheduleStateFlag(phase), // TODO: deprecated; replace with actual tumbler state (pending, running, completed, failed, cancelled)
    __raw: phase,
  }
  if (phase.kind === 'taker_coinjoin') {
    const internal = phase.destination?.toUpperCase() === 'INTERNAL'
    const details: TakerEntryDetails = {
      jarIndex: phase.mixdepth ?? -1,
      jar: jars.find((it) => it.jarIndex === phase.mixdepth),
      amountFraction: phase.amount_fraction ?? 0,
      numberOfRequestedCounterparties: phase.counterparty_count ?? 0,
      ...(internal === true
        ? {
            internal: true,
            externalDestinationAddress: undefined,
          }
        : {
            internal: false,
            externalDestinationAddress: phase.destination!,
          }),
    }
    value = { ...value, ...details }
  }
  if (phase.kind === 'maker_session') {
    const details: MakerEntryDetails = {
      durationSeconds: phase.duration_seconds ?? 0,
      idleTimeoutSeconds: phase.idle_timeout_seconds ?? 0,
    }
    value = { ...value, ...details }
  }
  return value
}

export const toScheduleProgressSummary = (schedule: Schedule): ScheduleProgressSummary => {
  if (schedule.length === 0) {
    return {
      totalWaitSeconds: 0,
      totalTransactions: 0,
      completedTransactions: 0,
      currentTransactionIndex: 0,
      isDone: true,
      entries: [],
    }
  }

  const completedTransactions = schedule.reduce((acc, entry) => {
    return acc + (isScheduleEntryConfirmed(entry) ? 1 : 0)
  }, 0)

  const totalWaitSeconds = Math.max(
    1,
    schedule.slice(0, Math.max(0, schedule.length - 1)).reduce((acc, entry) => {
      return acc + entry.waitTimeInSeconds
    }, 0),
  )

  const isDone = completedTransactions >= schedule.length
  const currentTransactionIndex = Math.min(completedTransactions, schedule.length - 1)

  const steps: ScheduleProgressStep[] = schedule.map((_entry, index) => {
    const widthPercent =
      index === 0
        ? FIRST_STEP_WIDTH_PERCENT
        : Math.max(MIN_STEP_WIDTH_PERCENT, (schedule[index - 1].waitTimeInSeconds / totalWaitSeconds) * 100)

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
      waitBeforeNextSeconds: index >= schedule.length - 1 ? 0 : entry.waitTimeInSeconds,
      state: toScheduleEntryState(entry),
      txid: getScheduleEntryTxId(entry),
      isLast: index === schedule.length - 1,
      step: steps[index],
      __raw: entry,
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
        currentTransactionIndex > 0 ? Math.ceil(schedule[currentTransactionIndex - 1].waitTimeInSeconds) : 0

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

// TODO: move to utils and use Intl.DurationFormat (es2025) if available
export const formatDuration = (seconds: number, t: TFunction): string => {
  const roundedSeconds = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(roundedSeconds / 60)
  const remainingSeconds = roundedSeconds % 60

  if (minutes === 0) {
    return t('global.duration_seconds', { seconds: remainingSeconds })
  }
  if (remainingSeconds === 0) {
    return t('global.duration_minutes', { minutes })
  }
  return t('global.duration_minutes_seconds', { minutes, seconds: remainingSeconds })
}
