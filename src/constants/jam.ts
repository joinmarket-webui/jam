import { percentageToFactor } from '@/lib/utils'
import { JM_API_AUTH_TOKEN_EXPIRY, JM_DUST_THRESHOLD } from './jm'

export const TX_FEES_FACTOR_MIN = 0 // 0%

/**
 * For the same reasons as stated above (comment for `TX_FEES_SATSPERKILOVBYTE_MIN`),
 * the maximum randomization factor must not be too high.
 * Settling on 50% as a reasonable compromise until this problem is addressed.
 * Once resolved, this can be set to 100% again.
 */
export const TX_FEES_FACTOR_MAX = percentageToFactor(50) // 50%
export const CJ_FEE_ABS_MIN = 1
export const CJ_FEE_ABS_MAX = 1_000_000 // 0.01 BTC - no enforcement by JM - this should be a "sane" max value
export const CJ_FEE_REL_MIN = percentageToFactor(0.0001)
export const CJ_FEE_REL_MAX = percentageToFactor(5) // no enforcement by JM - this should be a "sane" max value
export const MAX_SWEEP_FEE_CHANGE_MIN = percentageToFactor(50)
export const MAX_SWEEP_FEE_CHANGE_MAX = percentageToFactor(100)

export const OFFER_FEE_REL_MIN = percentageToFactor(0.0001)
export const OFFER_FEE_REL_MAX = percentageToFactor(10)
export const OFFER_FEE_REL_STEP = percentageToFactor(0.0001)

export const OFFER_FEE_ABS_MIN = 0

export const OFFER_MINSIZE_MIN = JM_DUST_THRESHOLD

export const JAM_JM_SESSION_REFRESH_MIN_INTERVAL = 5_000
export const JAM_JM_SESSION_REFRESH_DEFAULT_INTERVAL = 30_000
export const JAM_JM_SESSION_REFRESH_INTERVAL = Math.max(
  import.meta.env.VITE_JAM_JM_SESSION_REFRESH_INTERVAL ?? JAM_JM_SESSION_REFRESH_DEFAULT_INTERVAL,
  JAM_JM_SESSION_REFRESH_MIN_INTERVAL,
)
export const JAM_API_AUTH_TOKEN_RENEW_INTERVAL = Math.round(JM_API_AUTH_TOKEN_EXPIRY * 0.75)

export const JAM_RESCAN_PROGRESS_MIN_INTERVAL = 5_000
export const JAM_RESCAN_PROGRESS_DEFAULT_INTERVAL = 21_000
export const JAM_RESCAN_PROGRESS_INTERVAL = Math.max(
  import.meta.env.VITE_JAM_RESCAN_PROGRESS_INTERVAL ?? JAM_RESCAN_PROGRESS_DEFAULT_INTERVAL,
  JAM_RESCAN_PROGRESS_MIN_INTERVAL,
)

const JAM_SEED_MODAL_MIN_TIMEOUT = 5_000
const JAM_SEED_MODAL_DEFAULT_TIMEOUT = 21_000
export const JAM_SEED_MODAL_TIMEOUT = Math.max(
  import.meta.env.VITE_JAM_SEED_MODAL_TIMEOUT ?? JAM_SEED_MODAL_DEFAULT_TIMEOUT,
  JAM_SEED_MODAL_MIN_TIMEOUT,
)
