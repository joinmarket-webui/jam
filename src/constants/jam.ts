export const TX_FEES_FACTOR_MIN = 0 // 0%
/**
 * For the same reasons as stated above (comment for `TX_FEES_SATSPERKILOVBYTE_MIN`),
 * the maximum randomization factor must not be too high.
 * Settling on 50% as a reasonable compromise until this problem is addressed.
 * Once resolved, this can be set to 100% again.
 */
export const TX_FEES_FACTOR_MAX = 0.5 // 50%
export const CJ_FEE_ABS_MIN = 1
export const CJ_FEE_ABS_MAX = 1_000_000 // 0.01 BTC - no enforcement by JM - this should be a "sane" max value
export const CJ_FEE_REL_MIN = 0.000001 // 0.0001%
export const CJ_FEE_REL_MAX = 0.05 // 5% - no enforcement by JM - this should be a "sane" max value
export const MAX_SWEEP_FEE_CHANGE_MIN = 0.5 // 50%
export const MAX_SWEEP_FEE_CHANGE_MAX = 1 // 100%
