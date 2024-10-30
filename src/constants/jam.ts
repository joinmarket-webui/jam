import { percentageToFactor } from '../utils'

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
