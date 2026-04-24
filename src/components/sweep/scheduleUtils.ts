import type { TumblerPhaseResponse, TumblerPlanResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import type { TxId } from '@/store/jmTxStore'

// Phase ``status`` values mirror :class:`jm_tumbler.plan.PhaseStatus` on the
// backend. Treat any unknown value as ``pending`` so future status additions
// degrade gracefully.
export type SchedulePhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// Plan ``status`` values mirror :class:`jm_tumbler.plan.PlanStatus`.
export type SchedulePlanStatus = SchedulePhaseStatus

// Re-export the SDK schedule type under a UI-local alias so that consumers
// don't have to reach into the generated client and so that future shape
// changes are localized to this module.
export type Schedule = TumblerPlanResponse
export type SchedulePhase = TumblerPhaseResponse

export interface ScheduleProgressStep {
  widthPercent: number
  isComplete: boolean
  isActive: boolean
  isFirst: boolean
  isLast: boolean
}

export type ScheduleEntryState = 'pending' | 'broadcasted' | 'confirmed' | 'failed' | 'cancelled'

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

const PHASE_STATUS_VALUES: ReadonlySet<SchedulePhaseStatus> = new Set([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
])

const toPhaseStatus = (value: unknown): SchedulePhaseStatus => {
  return typeof value === 'string' && PHASE_STATUS_VALUES.has(value as SchedulePhaseStatus)
    ? (value as SchedulePhaseStatus)
    : 'pending'
}

export { toPhaseStatus }

const isTerminalStatus = (status: SchedulePhaseStatus): boolean => {
  return status === 'completed' || status === 'failed' || status === 'cancelled'
}

export const isScheduleTerminal = (schedule: Schedule): boolean => {
  return isTerminalStatus(toPhaseStatus(schedule.status))
}

const phaseTxId = (phase: SchedulePhase): TxId | undefined => {
  // Bondless taker bursts emit multiple txids; surface the most recent one
  // so the UI keeps showing live progress instead of falling back to the
  // single-tx ``txid`` field.
  const fromList = Array.isArray(phase.txids) && phase.txids.length > 0 ? phase.txids.at(-1) : null
  const candidate = phase.txid ?? fromList
  return typeof candidate === 'string' && candidate !== '' ? candidate : undefined
}

const phaseWaitSeconds = (phase: SchedulePhase): number => {
  return Number.isFinite(phase.wait_seconds) ? Math.max(0, phase.wait_seconds) : 0
}

const phaseEntryState = (phase: SchedulePhase): ScheduleEntryState => {
  const status = toPhaseStatus(phase.status)
  if (status === 'completed') return 'confirmed'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'running' && phaseTxId(phase) !== undefined) return 'broadcasted'
  return 'pending'
}

const isPhaseSuccessful = (phase: SchedulePhase): boolean => {
  // ``completed`` is the only terminal "succeeded" state. ``running`` with a
  // broadcast txid is still in flight: don't claim success until the runner
  // has confirmed it.
  return toPhaseStatus(phase.status) === 'completed'
}

const isPhaseFinished = (phase: SchedulePhase): boolean => {
  return isTerminalStatus(toPhaseStatus(phase.status))
}

export const isSchedulePhaseSuccessful = isPhaseSuccessful

// Narrow ``unknown`` to a usable ``Schedule``. This guards against pre-plan
// state (``null``/``undefined``) and ensures the required scalar fields are
// present so the rest of the module can operate without per-call validation.
export const isScheduleValue = (value: unknown): value is Schedule => {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Partial<Schedule>
  if (typeof candidate.plan_id !== 'string') return false
  if (typeof candidate.wallet_name !== 'string') return false
  if (typeof candidate.status !== 'string') return false
  if (!Array.isArray(candidate.destinations)) return false
  if (typeof candidate.current_phase !== 'number') return false
  if (!Array.isArray(candidate.phases)) return false
  return candidate.phases.every(
    (phase) =>
      phase !== null &&
      typeof phase === 'object' &&
      typeof phase.kind === 'string' &&
      typeof phase.index === 'number' &&
      typeof phase.status === 'string' &&
      typeof phase.wait_seconds === 'number',
  )
}

export const toScheduleProgressSummary = (schedule: Schedule): ScheduleProgressSummary => {
  const phases = schedule.phases
  if (phases.length === 0) {
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

  const planStatus = toPhaseStatus(schedule.status)
  const completedTransactions = phases.reduce((acc, phase) => acc + (isPhaseSuccessful(phase) ? 1 : 0), 0)

  // Sum waits between phases (i.e. drop the trailing phase's post-wait, since
  // there's nothing after it). Floor at 1 so per-step width math never divides
  // by zero on instant-run schedules.
  const totalWaitSeconds = Math.max(
    1,
    phases.slice(0, Math.max(0, phases.length - 1)).reduce((acc, phase) => acc + phaseWaitSeconds(phase), 0),
  )

  const isDone = isTerminalStatus(planStatus)

  // ``current_phase`` is authoritative when the plan is mid-run; otherwise
  // fall back to "after the last completed one" so the UI keeps highlighting
  // a sensible step before the runner advances the index.
  const currentPhaseIndex = (() => {
    const declared = schedule.current_phase
    if (typeof declared === 'number' && declared >= 0 && declared < phases.length) {
      return declared
    }
    return Math.min(completedTransactions, phases.length - 1)
  })()

  const steps: ScheduleProgressStep[] = phases.map((_phase, index) => {
    const widthPercent =
      index === 0
        ? MIN_STEP_WIDTH_PERCENT
        : Math.max(MIN_STEP_WIDTH_PERCENT, (Math.max(1, phaseWaitSeconds(phases[index - 1])) / totalWaitSeconds) * 100)

    const isPhaseComplete = isPhaseFinished(phases[index])
    return {
      widthPercent,
      isComplete: isPhaseComplete,
      isActive: !isDone && index === currentPhaseIndex && !isPhaseComplete,
      isFirst: index === 0,
      isLast: index === phases.length - 1,
    }
  })

  const entries: ScheduleProgressEntry[] = phases.map((phase, index) => ({
    index,
    waitBeforeNextSeconds: index >= phases.length - 1 ? 0 : phaseWaitSeconds(phase),
    state: phaseEntryState(phase),
    txid: phaseTxId(phase),
    isLast: index === phases.length - 1,
  }))

  let currentState: ScheduleCurrentState | undefined
  if (!isDone) {
    const activePhase = phases[currentPhaseIndex]
    const activeStatus = toPhaseStatus(activePhase.status)
    const activeTxId = phaseTxId(activePhase)

    if (activeStatus === 'running' && activeTxId !== undefined) {
      currentState = {
        type: 'waiting_for_confirmation',
        currentTransaction: currentPhaseIndex + 1,
        totalTransactions: phases.length,
        txid: activeTxId,
      }
    } else if (activeStatus === 'completed') {
      // The runner finished this phase but hasn't advanced ``current_phase``
      // yet (we're inside the inter-phase wait). Show the wait before the
      // next phase starts when there is one.
      const nextPhase = phases[currentPhaseIndex + 1]
      const waitSeconds = Math.ceil(phaseWaitSeconds(activePhase))
      currentState =
        nextPhase !== undefined && waitSeconds > 0
          ? {
              type: 'waiting_before_next',
              currentTransaction: currentPhaseIndex + 2,
              totalTransactions: phases.length,
              waitSeconds,
            }
          : {
              type: 'transaction_confirmed',
              currentTransaction: currentPhaseIndex + 1,
              totalTransactions: phases.length,
            }
    } else if (activeStatus === 'pending' && currentPhaseIndex > 0) {
      // We're between two phases: the previous one completed and the next is
      // queued but not yet started.
      const previousPhase = phases[currentPhaseIndex - 1]
      const waitSeconds = Math.ceil(phaseWaitSeconds(previousPhase))
      currentState =
        waitSeconds > 0
          ? {
              type: 'waiting_before_next',
              currentTransaction: currentPhaseIndex + 1,
              totalTransactions: phases.length,
              waitSeconds,
            }
          : {
              type: 'creating_and_broadcasting',
              currentTransaction: currentPhaseIndex + 1,
              totalTransactions: phases.length,
            }
    } else {
      currentState = {
        type: 'creating_and_broadcasting',
        currentTransaction: currentPhaseIndex + 1,
        totalTransactions: phases.length,
      }
    }
  }

  return {
    totalWaitSeconds,
    totalTransactions: phases.length,
    completedTransactions: Math.min(completedTransactions, phases.length),
    currentTransactionIndex: currentPhaseIndex,
    isDone,
    steps,
    entries,
    currentState,
  }
}

export const isScheduleLikelyCompletedSuccessfully = (schedule: Schedule, allUtxosFrozen: boolean): boolean => {
  const phases = schedule.phases
  if (phases.length === 0) return false

  // The plan status is authoritative when the runner reaches a terminal state.
  const planStatus = toPhaseStatus(schedule.status)
  if (planStatus === 'completed') return true
  if (planStatus === 'failed' || planStatus === 'cancelled') {
    // Mirror the legacy heuristic: if every non-final phase succeeded and the
    // user has no remaining spendable UTXOs, treat the run as a successful
    // sweep even if the last phase didn't formally complete.
    const allButLastSucceeded = phases.slice(0, -1).every((phase) => isPhaseSuccessful(phase))
    return allButLastSucceeded && allUtxosFrozen
  }

  // Plan still running but every phase succeeded — caller is asking whether
  // the run "looks done"; defer until the backend marks the plan completed.
  return false
}
