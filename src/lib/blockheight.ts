import type { BlockHeight } from '@/types/global'

export interface BlockCheckpoint {
  timestamp: number // Unix epoch in seconds
  height: number
}

/**
 * Historical Bitcoin milestones used for piecewise linear blockheight interpolation.
 * Each anchor represents a verified block and its on-chain timestamp.
 */
export const BITCOIN_CHECKPOINTS: readonly BlockCheckpoint[] = [
  { timestamp: 1230999305, height: 0 }, // Genesis block 0 (2009-01-03 18:15:05 UTC)
  { timestamp: 1354116278, height: 210_000 }, // Halving 1 (2012-11-28 15:24:38 UTC)
  { timestamp: 1468082773, height: 420_000 }, // Halving 2 (2016-07-09 16:46:13 UTC)
  { timestamp: 1503539862, height: 481_824 }, // SegWit activation (2017-08-24 01:57:42 UTC)
  { timestamp: 1589225023, height: 630_000 }, // Halving 3 (2020-05-11 19:23:43 UTC)
  { timestamp: 1636866944, height: 709_632 }, // Taproot activation (2021-11-14 05:15:44 UTC)
  { timestamp: 1713571767, height: 840_000 }, // Halving 4 (2024-04-20 00:09:27 UTC)
]

export const BITCOIN_GENESIS_YEAR = 2009
export const BITCOIN_GENESIS_MONTH = 1

/**
 * Default safety buffer in months.
 * Per maintainer guidance, human time to block conversion is fuzzy, so a 1-month
 * safety buffer guarantees that transactions created early in the month are not missed.
 */
export const DEFAULT_SAFETY_BUFFER_MONTHS = 1

export interface EstimateBlockheightOptions {
  year: number
  month: number // 1 - 12
  currentBlockHeight?: BlockHeight
  safetyBufferMonths?: number
}

/**
 * Estimates a Bitcoin blockheight for a given Year and Month using piecewise linear
 * interpolation anchored to major Bitcoin checkpoints, with an explicit safety buffer.
 */
export function estimateBlockheightFromDate({
  year,
  month,
  currentBlockHeight,
  safetyBufferMonths = DEFAULT_SAFETY_BUFFER_MONTHS,
}: EstimateBlockheightOptions): number {
  if (year < BITCOIN_GENESIS_YEAR || (year === BITCOIN_GENESIS_YEAR && month <= BITCOIN_GENESIS_MONTH)) {
    return 0
  }

  // Subtract the safety buffer in months
  let bufferedYear = year
  let bufferedMonth = month - safetyBufferMonths
  while (bufferedMonth < 1) {
    bufferedMonth += 12
    bufferedYear -= 1
  }

  if (
    bufferedYear < BITCOIN_GENESIS_YEAR ||
    (bufferedYear === BITCOIN_GENESIS_YEAR && bufferedMonth <= BITCOIN_GENESIS_MONTH)
  ) {
    return 0
  }

  // Target the first second of the buffered month (00:00:00 UTC)
  const targetTimestamp = Math.floor(Date.UTC(bufferedYear, bufferedMonth - 1, 1, 0, 0, 0) / 1000)

  if (targetTimestamp <= BITCOIN_CHECKPOINTS[0].timestamp) {
    return 0
  }

  const lastCheckpoint = BITCOIN_CHECKPOINTS.at(-1)!
  let estimatedHeight: number

  if (targetTimestamp >= lastCheckpoint.timestamp) {
    // Beyond the latest checkpoint: extrapolate forward at 600 seconds per block
    const elapsedSeconds = targetTimestamp - lastCheckpoint.timestamp
    const additionalBlocks = Math.floor(elapsedSeconds / 600)
    estimatedHeight = lastCheckpoint.height + additionalBlocks
  } else {
    // Interpolate between the two surrounding checkpoints
    let previousCheckpoint = BITCOIN_CHECKPOINTS[0]
    let nextCheckpoint = lastCheckpoint

    for (let index = 0; index < BITCOIN_CHECKPOINTS.length - 1; index++) {
      if (
        targetTimestamp >= BITCOIN_CHECKPOINTS[index].timestamp &&
        targetTimestamp < BITCOIN_CHECKPOINTS[index + 1].timestamp
      ) {
        previousCheckpoint = BITCOIN_CHECKPOINTS[index]
        nextCheckpoint = BITCOIN_CHECKPOINTS[index + 1]
        break
      }
    }

    const timeDelta = nextCheckpoint.timestamp - previousCheckpoint.timestamp
    const heightDelta = nextCheckpoint.height - previousCheckpoint.height
    const progress = (targetTimestamp - previousCheckpoint.timestamp) / timeDelta
    estimatedHeight = Math.floor(previousCheckpoint.height + progress * heightDelta)
  }

  let finalHeight = Math.max(0, estimatedHeight)

  // Clamp to current chain blockheight if known
  if (currentBlockHeight !== undefined && currentBlockHeight > 0) {
    finalHeight = Math.min(finalHeight, currentBlockHeight)
  }

  return finalHeight
}

/**
 * Returns available year options from Genesis (2009) to current year in descending order.
 */
export function getAvailableYearOptions(
  maxYear: number = new Date().getUTCFullYear(),
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  for (let yearValue = maxYear; yearValue >= BITCOIN_GENESIS_YEAR; yearValue--) {
    options.push({ value: String(yearValue), label: String(yearValue) })
  }
  return options
}

/**
 * Returns localized month options (01 - 12).
 */
export function getMonthOptions(): { value: string; label: string }[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const label = new Date(Date.UTC(2000, index, 1)).toLocaleDateString(undefined, {
      month: 'long',
      timeZone: 'UTC',
    })
    return {
      value: String(month).padStart(2, '0'),
      label,
    }
  })
}
