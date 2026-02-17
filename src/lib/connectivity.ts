import { normalizeAppError } from '@/lib/errorReason'
import type { Milliseconds } from '@/types/global'

const CONNECTIVITY_ERROR_PATTERNS = [
  /failed to fetch/i,
  /fetch failed/i,
  /network ?error/i,
  /network request failed/i,
  /internet connection appears to be offline/i,
  /load failed/i,
  /err_network/i,
  /econnrefused/i,
  /connection refused/i,
  /connection reset/i,
  /timed out/i,
]

export const isConnectivityError = (error: unknown): boolean => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true
  }

  const normalized = normalizeAppError(error)
  const combinedMessage = [normalized.message, normalized.error_description].filter(Boolean).join(' ').toLowerCase()

  if (!combinedMessage) {
    return false
  }

  return CONNECTIVITY_ERROR_PATTERNS.some((pattern) => pattern.test(combinedMessage))
}

const RETRY_DELAY_BASE: Milliseconds = 2_000
const RETRY_DELAY_MAX: Milliseconds = 60_000

export const calculateOfflineRetryDelay = (attemptNumber: number): Milliseconds => {
  const safeAttemptNumber = Math.max(1, attemptNumber)
  const exponentialDelay = RETRY_DELAY_BASE * 2 ** (safeAttemptNumber - 1)
  return Math.min(RETRY_DELAY_MAX, exponentialDelay)
}
