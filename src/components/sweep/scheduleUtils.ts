import type { TumblerPhaseResponse, TumblerPlanResponse } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import type { TFunction } from 'i18next'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { TxId } from '@/store/jmTxStore'
import type { BitcoinAddress, JarIndex, Seconds } from '@/types/global'

type AmountCounterparties = number
type ScheduleEntryKind = 'taker_coinjoin' | 'maker_session' | TumblerPhaseResponse['kind']
type ScheduleEntryStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped' | TumblerPhaseResponse['status']
type ScheduleStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | TumblerPlanResponse['status']

export type TakerEntryDetails = {
  jarIndex: JarIndex
  jar?: Jar
  amountFraction?: number
  isSweep: boolean
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
  index: number
  kind: ScheduleEntryKind
  startedAt?: Date
  finishedAt?: Date
  waitTimeInSeconds: Seconds
  status: {
    value: ScheduleEntryStatus
    pending: boolean
    running: boolean
    completed: boolean
    failed: boolean
    cancelled: boolean
    skipped: boolean
  }
  derivedStatus: {
    terminated: boolean
  }
  transactionId?: TxId
  __raw?: TumblerPhaseResponse // TODO: not optional
} & Partial<TakerEntryDetails> &
  Partial<MakerEntryDetails>

export type ScheduleDerivedStatus = 'waiting_before_next' | 'waiting_for_confirmation'

export interface ScheduleSummary {
  status: {
    value: ScheduleStatus
    pending: boolean
    running: boolean
    completed: boolean
    failed: boolean
    cancelled: boolean
  }
  derivedStatus: {
    value: ScheduleDerivedStatus | ScheduleStatus
    terminated: boolean
  }
  totalWaitSeconds: number
  externalDestinationAddresses: BitcoinAddress[]
}

export interface ScheduleProgressSummary {
  steps: ScheduleProgressStep[]
}

export interface ScheduleProgressStep {
  widthPercent: number
  completed: boolean
  active: boolean
}

// TODO: refactor to object with summary props
export type Schedule = {
  summary: ScheduleSummary
  progress: {
    steps: ScheduleProgressStep[]
  }
  active?: ScheduleEntry
  entries: ScheduleEntry[]
  completed: ScheduleEntry[]
}

const FIRST_STEP_WIDTH_PERCENT = 5
const MIN_STEP_WIDTH_PERCENT = 3

export const toSchedule = (plan: TumblerPlanResponse, jars: Jar[]): Schedule => {
  const entries = plan.phases.map((it) => toScheduleEntry(it, jars))
  const completed = entries.filter((it) => it.status.completed === true)

  const totalWaitSeconds: Seconds = Math.max(
    1,
    entries.slice(0, Math.max(0, entries.length - 1)).reduce((acc, entry) => {
      return acc + entry.waitTimeInSeconds
    }, 0),
  )

  const externalDestinationAddresses = entries
    .filter((it) => it.externalDestinationAddress !== undefined)
    .map((it) => it.externalDestinationAddress!)

  const status: ScheduleSummary['status'] = {
    value: plan.status,
    pending: plan.status === 'pending',
    running: plan.status === 'running',
    completed: plan.status === 'completed',
    failed: plan.status === 'failed',
    cancelled: plan.status === 'cancelled',
  }
  const terminated = !status.pending && !status.running
  const active = !status.running ? undefined : entries.find((it) => it.index === plan.current_phase)

  const summary: ScheduleSummary = {
    status,
    derivedStatus: {
      value: toScheduleDerivedStatus(entries, active) ?? plan.status,
      terminated,
    },
    totalWaitSeconds: totalWaitSeconds,
    externalDestinationAddresses,
  }

  const progress = toScheduleProgressSummary(summary, entries, active)

  return {
    summary,
    progress,
    active,
    completed,
    entries,
  }
}

export const toScheduleEntry = (phase: TumblerPhaseResponse, jars: Jar[]): ScheduleEntry => {
  const status: ScheduleEntry['status'] = {
    value: phase.status,
    pending: phase.status === 'pending',
    completed: phase.status === 'completed',
    running: phase.status === 'running',
    failed: phase.status === 'failed',
    cancelled: phase.status === 'cancelled',
    skipped: phase.status === 'skipped',
  }
  let value: ScheduleEntry = {
    index: phase.index,
    kind: phase.kind,
    status,
    derivedStatus: {
      terminated: !status.pending && !status.running,
    },
    startedAt: phase.started_at ? new Date(Date.parse(phase.started_at)) : undefined,
    finishedAt: phase.finished_at ? new Date(Date.parse(phase.finished_at)) : undefined,
    waitTimeInSeconds: phase.wait_seconds ?? 0,
    transactionId: phase.txid ?? undefined,
    __raw: phase,
  }

  if (phase.kind === 'taker_coinjoin') {
    const internal = phase.destination?.toUpperCase() === 'INTERNAL'
    const details: TakerEntryDetails = {
      jarIndex: phase.mixdepth ?? -1,
      jar: jars.find((it) => it.jarIndex === phase.mixdepth),
      isSweep: phase.amount === 0,
      amountFraction: phase.amount_fraction ?? undefined,
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

const toScheduleProgressSummary = (
  summary: ScheduleSummary,
  entries: ScheduleEntry[],
  activeEntry: ScheduleEntry | undefined,
): ScheduleProgressSummary => {
  const steps: ScheduleProgressStep[] = entries.map((entry) => {
    const previousEntry = entries.find((it) => it.index === entry.index - 1)
    const widthPercent =
      entry.index === 0
        ? FIRST_STEP_WIDTH_PERCENT
        : Math.max(MIN_STEP_WIDTH_PERCENT, ((previousEntry?.waitTimeInSeconds ?? 0) / summary.totalWaitSeconds) * 100)

    return {
      widthPercent,
      completed: entry.status.completed === true,
      active: entry === activeEntry,
    }
  })

  return {
    steps,
  }
}

export const toScheduleDerivedStatus = (
  entries: ScheduleEntry[],
  activeEntry: ScheduleEntry | undefined,
): ScheduleDerivedStatus | undefined => {
  // Infer the user-facing phase from the currently active entry and the previous wait slot.
  if (activeEntry?.transactionId !== undefined) {
    return 'waiting_for_confirmation'
  }

  const previousEntry = activeEntry && entries.find((it) => it.index === activeEntry.index - 1)
  if (previousEntry?.status.completed === true && activeEntry?.startedAt === undefined) {
    return 'waiting_before_next'
  }

  return undefined
}

// TODO: move to utils and use Intl.DurationFormat (es2025) if available
export const formatDuration = (seconds: number, t: TFunction): string => {
  const roundedSeconds = Math.max(0, Math.ceil(seconds))
  const minutes = Math.floor(roundedSeconds / 60)
  const remainingSeconds = roundedSeconds % 60

  if (minutes === 0) {
    return t('global.duration_seconds', { seconds: remainingSeconds.toLocaleString() })
  }
  if (remainingSeconds === 0) {
    return t('global.duration_minutes', { minutes: minutes.toLocaleString() })
  }
  return t('global.duration_minutes_seconds', {
    minutes: minutes.toLocaleString(),
    seconds: remainingSeconds.toLocaleString(),
  })
}
