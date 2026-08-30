import type { AmountSats, Factor, Milliseconds, Seconds } from '@/types/global'
import { parseAsIntOrDefault } from './meta-env-utils'

export const JM_WALLET_FILE_EXTENSION = '.jmdat'
export const JM_DEFAULT_WALLET_TYPE = 'sw-fb'

export const JM_API_AUTH_TOKEN_EXPIRY_DEFAULT: Milliseconds = Math.round(0.5 * 60 * 60 * 1_000)
export const JM_API_AUTH_TOKEN_EXPIRY_MIN: Milliseconds = 10 * 1_000
export const JM_API_AUTH_TOKEN_EXPIRY_MAX: Milliseconds = Math.round(JM_API_AUTH_TOKEN_EXPIRY_DEFAULT * 0.75)

export const JM_API_AUTH_TOKEN_EXPIRY: Milliseconds = Math.max(
  JM_API_AUTH_TOKEN_EXPIRY_MIN,
  Math.min(
    parseAsIntOrDefault(
      import.meta.env.VITE_JM_API_AUTH_TOKEN_EXPIRY_SECONDS,
      JM_API_AUTH_TOKEN_EXPIRY_DEFAULT / 1_000,
    ) * 1_000,
    JM_API_AUTH_TOKEN_EXPIRY_MAX,
  ),
)

// initial value for `max_sweep_fee_change` from the default joinmarket.cfg (last check on 2026-04-22 of v0.9.12)
export const JM_MAX_SWEEP_FEE_CHANGE_DEFAULT = 0.8

export const JM_DUST_THRESHOLD: AmountSats = 27_300

// initial value for `minimum_makers` from the default joinmarket.cfg (last check on 2022-02-20 of v0.9.5)
export const JM_MINIMUM_MAKERS_DEFAULT = 4

// initial value for `tx_fees` from the default joinmarket.cfg (last check on 2026-04-22 of v0.9.12)
export const JM_TX_FEES_DEFAULT = 3

// initial value for `tx_fees_factor` from the default joinmarket.cfg (last check on 2026-04-22 of v0.9.12)
export const JM_TX_FEES_FACTOR_DEFAULT = 0.2

export const JM_GAPLIMIT_DEFAULT = 6

// initial value for `TAKER__UTXO_AGE` (last checked on 2026-07-19)
// https://github.com/joinmarket-ng/joinmarket-ng/blob/0.34.1/jmcore/src/jmcore/settings.py#L877C5-L877C19
export const JM_TAKER_UTXO_AGE = 5

// initial value for `TUMBLER__MIN_CONFIRMATIONS_BETWEEN_PHASES` (last checked on 2026-07-19)
// https://github.com/joinmarket-ng/joinmarket-ng/blob/0.34.1/jmcore/src/jmcore/settings.py#L1031
export const JM_TUMBLER_MIN_CONFIRMATIONS_BETWEEN_PHASES = 6

export const JM_GAPLIMIT_CONFIGKEY: ConfigKey = {
  section: 'POLICY',
  field: 'gaplimit',
}

// only support starting the maker with native segwit offers
type RelativeOfferType = 'sw0reloffer'
type AbsoluteOfferType = 'sw0absoffer'

export type OfferType = RelativeOfferType | AbsoluteOfferType

export const OFFERTYPE_ABS: OfferType = 'sw0absoffer'
export const OFFERTYPE_REL: OfferType = 'sw0reloffer'

export type SectionKey = string

export interface ConfigKey {
  section: SectionKey
  field: string
}

export interface ConfigValue {
  key: ConfigKey
  value: string | null
}

export type FeeConfigName = 'tx_fees' | 'tx_fees_factor' | 'max_cj_fee_abs' | 'max_cj_fee_rel' | 'max_sweep_fee_change'

export const FEE_CONFIG_KEYS: Record<FeeConfigName, ConfigKey> = {
  tx_fees: { section: 'POLICY', field: 'tx_fees' },
  tx_fees_factor: { section: 'POLICY', field: 'tx_fees_factor' },
  max_cj_fee_abs: { section: 'POLICY', field: 'max_cj_fee_abs' },
  max_cj_fee_rel: { section: 'POLICY', field: 'max_cj_fee_rel' },
  max_sweep_fee_change: { section: 'POLICY', field: 'max_sweep_fee_change' },
}

// https://github.com/joinmarket-ng/joinmarket-ng/blob/0.33.0/tumbler/src/tumbler/builder.py#L49 (last checked: 2026-07-14)
export interface TumblerParameters {
  maker_count_min: number
  maker_count_max: number
  // Average wait between phases (mean of an exponential distribution)
  time_lambda_seconds: Seconds
  // Multiplier on ``time_lambda_seconds`` for stage-1 (cleavage) sweeps
  stage1_wait_multiplier: Factor
  include_maker_sessions: boolean
  mincjamount_sats: AmountSats
  maker_session_seconds: Seconds
  /**
   * If set, maker phases exit successfully when no CoinJoin has been served
   * within this many seconds. Useful as a safety fallback when the wallet is
   * never selected as a counterparty.
   */
  maker_session_idle_timeout_seconds: Seconds | undefined
  // Minimum number of destination-bearing taker CJs per mixdepth (excluding sweep).
  mintxcount: number
  // Maximum re-tries per failed taker CoinJoin phase before the plan fails
  max_phase_retries: number
  // Probability that any given non-sweep taker CJ amount is rounded to a random number of significant figures. Set to 0.0 to disable rounding entirely.
  rounding_chance: Factor
}

export const JM_NG_DEFAULT_TUMBLER_PARAMS: TumblerParameters = {
  maker_count_min: 5, // default: 5
  maker_count_max: 9, // default: 9
  // Average wait between phases (mean of an exponential distribution)
  time_lambda_seconds: 6 * 60 * 60, // default: 6 hours
  // Multiplier on ``time_lambda_seconds`` for stage-1 (cleavage) sweeps
  stage1_wait_multiplier: 3, // default: 3.0
  include_maker_sessions: true, // default: true
  mincjamount_sats: 100_000, // default: 100_000
  maker_session_seconds: 12 * 60 * 60, // default: 12.0 * 60.0 * 60.0
  /**
   * If set, maker phases exit successfully when no CoinJoin has been served
   * within this many seconds. Useful as a safety fallback when the wallet is
   * never selected as a counterparty.
   */
  maker_session_idle_timeout_seconds: undefined, // default: undefined
  // Minimum number of destination-bearing taker CJs per mixdepth (excluding sweep).
  mintxcount: 2, // default: 2
  // Maximum re-tries per failed taker CoinJoin phase before the plan fails
  max_phase_retries: 3, // default: 3
  // Probability that any given non-sweep taker CJ amount is rounded to a random number of significant figures. Set to 0.0 to disable rounding entirely.
  rounding_chance: 0.25, // default: 0.25
}
