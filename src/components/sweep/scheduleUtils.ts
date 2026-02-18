export type ScheduleEntry = Array<string | number>
export type Schedule = ScheduleEntry[]

export interface ScheduleProgressStep {
  widthPercent: number
  isComplete: boolean
  isActive: boolean
  isFirst: boolean
  isLast: boolean
}

export interface ScheduleProgressSummary {
  totalWaitSeconds: number
  totalTransactions: number
  completedTransactions: number
  currentTransactionIndex: number
  isDone: boolean
  steps: ScheduleProgressStep[]
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

const isScheduleEntryConfirmed = (entry: ScheduleEntry): boolean => {
  return getScheduleEntryState(entry) === 1
}

export const isScheduleEntrySuccessful = (entry: ScheduleEntry): boolean => {
  const state = getScheduleEntryState(entry)
  return state === 1 || typeof state === 'string'
}

export const isScheduleValue = (value: unknown): value is Schedule => {
  return Array.isArray(value) && value.every((entry) => Array.isArray(entry))
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

  return {
    totalWaitSeconds,
    totalTransactions: schedule.length,
    completedTransactions: Math.min(completedTransactions, schedule.length),
    currentTransactionIndex: Math.min(completedTransactions, schedule.length - 1),
    isDone,
    steps,
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
