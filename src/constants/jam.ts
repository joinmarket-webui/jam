import { percentageToFactor, parseSemanticVersion } from '@/lib/utils'
import type { AmountSats, Factor, Milliseconds, Seconds } from '@/types/global'
import { version as packageInfoVersion } from '../../package.json'
import {
  JM_API_AUTH_TOKEN_EXPIRY,
  JM_DUST_THRESHOLD,
  JM_MINIMUM_MAKERS_DEFAULT,
  JM_NG_DEFAULT_TUMBLER_PARAMS,
  JM_WALLET_FILE_EXTENSION,
} from './jm'
import { parseAsBooleanOrDefault, parseAsIntOrDefault } from './meta-env-utils'

export const APP_DISPLAY_VERSION = (() => {
  return parseSemanticVersion(packageInfoVersion)
})()

export const JAM_DEFAULT_THEME: 'dark' | 'light' = import.meta.env.VITE_JAM_DEFAULT_THEME === 'light' ? 'light' : 'dark'

const JAM_REPO_URL_DEFAULT: string = 'https://github.com/joinmarket-webui/jam'
export const JAM_REPO_URL: string = (import.meta.env.VITE_JAM_REPO_URL || JAM_REPO_URL_DEFAULT) as string

const JAM_DOCS_URL_DEFAULT: string = 'https://joinmarket-webui.github.io/jamdocs'
export const JAM_DOCS_URL: string = (import.meta.env.VITE_JAM_DOCS_URL || JAM_DOCS_URL_DEFAULT) as string

const JAM_MATRIX_URL_DEFAULT: string = 'https://matrix.to/#/%23jam:bitcoin.kyoto'
export const JAM_MATRIX_URL: string = (import.meta.env.VITE_JAM_MATRIX_URL || JAM_MATRIX_URL_DEFAULT) as string

const JAM_TELEGRAM_URL_DEFAULT: string = 'https://t.me/JoinMarketWebUI'
export const JAM_TELEGRAM_URL: string = (import.meta.env.VITE_JAM_TELEGRAM_URL || JAM_TELEGRAM_URL_DEFAULT) as string

const JAM_JMNG_REPO_URL_DEFAULT: string = 'https://github.com/joinmarket-ng/joinmarket-ng'
export const JAM_JMNG_REPO_URL: string = (import.meta.env.VITE_JAM_JMNG_REPO_URL || JAM_JMNG_REPO_URL_DEFAULT) as string

export const JAM_JM_RETRIES_DOCS_URL =
  'https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/SOURCING-COMMITMENTS.md'

export const MAX_WALLET_NAME_LENGTH = 240 - JM_WALLET_FILE_EXTENSION.length

export const TX_FEES_FACTOR_MIN = 0 // 0%

/**
 * For the same reasons as stated above (comment for `TX_FEES_SATSPERKILOVBYTE_MIN`),
 * the maximum randomization factor must not be too high.
 * Settling on 50% as a reasonable compromise until this problem is addressed.
 * Once resolved, this can be set to 100% again.
 */
export const TX_FEES_FACTOR_MAX: Factor = percentageToFactor(50) // TODO: since JM 0.9.11, this is only applied to the upside, so it can also be 110%, why limit it to 50%?
export const CJ_FEE_ABS_MIN: AmountSats = 1
export const CJ_FEE_ABS_MAX: AmountSats = 1_000_000 // 0.01 BTC - no enforcement by JM - this should be a "sane" max value
export const CJ_FEE_REL_MIN: Factor = percentageToFactor(0.0001)
export const CJ_FEE_REL_MAX: Factor = percentageToFactor(5) // no enforcement by JM - this should be a "sane" max value
export const MAX_SWEEP_FEE_CHANGE_MIN: Factor = percentageToFactor(50) // no enforcement by JM - should be a "sane" min vaue (too low and users might run into problems on sweeps)
export const MAX_SWEEP_FEE_CHANGE_MAX: Factor = percentageToFactor(100) // TODO: this can also be 200%, why limit it to 100%?

const OFFER_FEE_BANDS: {
  relative: Factor[]
  absolute: AmountSats[]
} = {
  relative: [0.00002, 0.00005, 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1],
  absolute: [0, 100, 200, 500, 1_000, 2_000, 5_000, 10_000],
}

export const OFFER_FEE_REL_MIN: Factor = percentageToFactor(0.0001)
export const OFFER_FEE_REL_MAX: Factor = percentageToFactor(10)
export const OFFER_FEE_REL_STEP: Factor = percentageToFactor(0.0001)
export const OFFER_FEE_REL_DEFAULT: Factor = OFFER_FEE_BANDS.relative[0]

export const OFFER_FEE_ABS_MIN: AmountSats = 0
export const OFFER_FEE_ABS_DEFAULT: AmountSats = OFFER_FEE_BANDS.absolute[0]

export const OFFER_MINSIZE_MIN: AmountSats = JM_DUST_THRESHOLD
export const OFFER_MINSIZE_DEFAULT: AmountSats = 100_000

export const JAM_JM_SESSION_REFRESH_MIN_INTERVAL: Milliseconds = 5_000
export const JAM_JM_SESSION_REFRESH_DEFAULT_INTERVAL: Milliseconds = 30_000
export const JAM_JM_SESSION_REFRESH_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_JM_SESSION_REFRESH_INTERVAL, JAM_JM_SESSION_REFRESH_DEFAULT_INTERVAL),
  JAM_JM_SESSION_REFRESH_MIN_INTERVAL,
)
export const JAM_API_AUTH_TOKEN_RENEW_INTERVAL: Milliseconds = Math.round(JM_API_AUTH_TOKEN_EXPIRY * 0.75)

export const JAM_RESCAN_PROGRESS_MIN_INTERVAL: Milliseconds = 5_000
export const JAM_RESCAN_PROGRESS_DEFAULT_INTERVAL: Milliseconds = 21_000
export const JAM_RESCAN_PROGRESS_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_RESCAN_PROGRESS_INTERVAL, JAM_RESCAN_PROGRESS_DEFAULT_INTERVAL),
  JAM_RESCAN_PROGRESS_MIN_INTERVAL,
)

export const WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_WAIT_FOR_UPDATE_SESSION_POLLING_INTERVAL, 3_000),
  1_000,
)
export const WAIT_FOR_UPDATE_SESSION_POLLING_DELAY: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_WAIT_FOR_UPDATE_SESSION_POLLING_DELAY, 1_000),
  1,
)

export const WAIT_FOR_UPDATE_ORDERBOOK_POLLING_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_WAIT_FOR_UPDATE_ORDERBOOK_POLLING_INTERVAL, 15_000),
  1_000,
)
export const VISIBLE_ORDERBOOK_POLLING_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_VISIBLE_ORDERBOOK_POLLING_INTERVAL, 120_000),
  1_000,
)

export const RUNNING_COINJOIN_POLLING_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_RUNNING_COINJOIN_POLLING_INTERVAL, 5_000),
  1_000,
)
export const RUNNING_COINJOIN_POLLING_DELAY: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_RUNNING_COINJOIN_POLLING_DELAY, 1_000),
  1,
)

export const RUNNING_SCHEDULE_POLLING_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_RUNNING_SCHEDULE_POLLING_INTERVAL, 10_000),
  1_000,
)

/**
 * In order to prevent state mismatch, the 'maker stop' response is delayed shortly.
 * Even though the API response suggests that the maker has started or stopped immediately, it seems that this is not always the case.
 * There is currently no way to know for sure - adding a delay at least mitigates the problem.
 * 2022-04-26: With value of 2_000ms, no state corruption could be provoked in a local dev setup.
 */
export const MAKER_STOP_RESPONSE_DELAY: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_MAKER_STOP_RESPONSE_DELAY, 2_000),
  1,
)

export const JMWALLETD_LOGS_POLLING_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_JMWALLETD_LOGS_POLLING_INTERVAL, 2_500),
  500,
)

const JAM_SEED_MODAL_MIN_TIMEOUT: Milliseconds = 5_000
const JAM_SEED_MODAL_DEFAULT_TIMEOUT: Milliseconds = 30_000
export const JAM_SEED_MODAL_TIMEOUT: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_SEED_MODAL_TIMEOUT, JAM_SEED_MODAL_DEFAULT_TIMEOUT),
  JAM_SEED_MODAL_MIN_TIMEOUT,
)

// minimum amount of time in milliseconds the connection must stay open to be considered "healthy"
const JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_MIN_DURATION: Milliseconds = 1_000
export const JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION, 0),
  JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_MIN_DURATION,
)

const JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_MIN_DURATION: Milliseconds = 1_000
const JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DEFAULT_DURATION: Milliseconds = 3_000
export const JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION: Milliseconds = Math.max(
  parseAsIntOrDefault(
    import.meta.env.VITE_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION,
    JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DEFAULT_DURATION,
  ),
  JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_MIN_DURATION,
)

// webservers will close a websocket connection on inactivity (e.g nginx default is 60s)
// specify the time in milliseconds at least one 'keepalive' message is sent
const JAM_JM_WEBSOCKET_KEEPALIVE_MESSAGE_MIN_INTERVAL: Milliseconds = 5_000
const JAM_JM_WEBSOCKET_KEEPALIVE_MESSAGE_DEFAULT_INTERVAL: Milliseconds = 30_000
export const JAM_JM_WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL: Milliseconds = Math.max(
  parseAsIntOrDefault(
    import.meta.env.VITE_JM_WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL,
    JAM_JM_WEBSOCKET_KEEPALIVE_MESSAGE_DEFAULT_INTERVAL,
  ),
  JAM_JM_WEBSOCKET_KEEPALIVE_MESSAGE_MIN_INTERVAL,
)

export const JAM_JM_WEBSOCKET_RECONNECT_INTERVAL_MIN: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JM_WEBSOCKET_RECONNECT_INTERVAL_MIN, 0),
  5_000,
)

export const JAM_JM_WEBSOCKET_RECONNECT_INTERVAL_MAX: Milliseconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JM_WEBSOCKET_RECONNECT_INTERVAL_MAX, 0),
  60_000,
)

export const JAM_SWEEP_MAKER_SESSION_IDLE_MIN_TIMEOUT_SECONDS: Seconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_SWEEP_MAKER_SESSION_IDLE_MIN_TIMEOUT_SECONDS, 60 * 60),
  1,
)
const JAM_SWEEP_MAKER_SESSION_IDLE_DEFAULT_TIMEOUT_SECONDS: Seconds =
  JM_NG_DEFAULT_TUMBLER_PARAMS.maker_session_seconds - 15 * 60
export const JAM_SWEEP_MAKER_SESSION_IDLE_TIMEOUT_SECONDS: Seconds = Math.max(
  parseAsIntOrDefault(
    import.meta.env.VITE_JAM_SWEEP_MAKER_SESSION_IDLE_TIMEOUT_SECONDS,
    JAM_SWEEP_MAKER_SESSION_IDLE_DEFAULT_TIMEOUT_SECONDS,
  ),
  JAM_SWEEP_MAKER_SESSION_IDLE_MIN_TIMEOUT_SECONDS,
)

export const JAM_SWEEP_DESTINATION_ADDRESSES_MIN_COUNT: number = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_SWEEP_DESTINATION_ADDRESSES_MIN_COUNT, 3),
  1,
)
export const JAM_SWEEP_DESTINATION_ADDRESSES_DEFAULT_COUNT: Seconds = Math.max(
  parseAsIntOrDefault(import.meta.env.VITE_JAM_SWEEP_DESTINATION_ADDRESSES_DEFAULT_COUNT, 3),
  JAM_SWEEP_DESTINATION_ADDRESSES_MIN_COUNT,
)

// see https://github.com/joinmarket-ng/joinmarket-ng/blob/0.34.2/tumbler/src/tumbler/plan.py#L176 (last checked 2026-07-22)
export const JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS = 20
export const JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS = Math.max(
  Math.min(
    parseAsIntOrDefault(import.meta.env.VITE_JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS, JM_MINIMUM_MAKERS_DEFAULT),
    JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS,
  ),
  1,
)

// see https://github.com/joinmarket-ng/joinmarket-ng/blob/0.34.2/tumbler/src/tumbler/plan.py#L177 (last checked 2026-07-22)
export const JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS = JAM_SWEEP_MAX_MIN_NUMBER_OF_COLLABORATORS
export const JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS = JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS

export const JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR = 2
export const JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR = 8

export const JAM_SWEEP_DEFAULT_MIN_ROUNDING_CHANCE_PERCENT: number = 0
export const JAM_SWEEP_DEFAULT_MAX_ROUNDING_CHANCE_PERCENT: number = 100

export const JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT: number = Math.max(
  parseAsIntOrDefault(
    import.meta.env.VITE_JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT,
    JAM_SWEEP_DEFAULT_MIN_ROUNDING_CHANCE_PERCENT,
  ),
  JAM_SWEEP_DEFAULT_MIN_ROUNDING_CHANCE_PERCENT,
)

export const JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT = Math.max(
  parseAsIntOrDefault(
    import.meta.env.VITE_JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT,
    JAM_SWEEP_DEFAULT_MAX_ROUNDING_CHANCE_PERCENT,
  ),
  JAM_SWEEP_DEFAULT_MIN_ROUNDING_CHANCE_PERCENT,
)

const JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DEFAULT = true
export const JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS = parseAsBooleanOrDefault(
  import.meta.env.VITE_JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS,
  JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DEFAULT,
)

// provide some time for the backend to catch up after fb is created, small delay of ~1s seems to be enough
export const JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DEFAULT_DELAY: Milliseconds = 1000
export const JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_MIN_DELAY: Milliseconds = 21
export const JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DELAY = Math.max(
  parseAsIntOrDefault(
    import.meta.env.VITE_JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DELAY,
    JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_DEFAULT_DELAY,
  ),
  JAM_TRY_FREEZE_CREATED_FIDELITY_BOND_OUTPUTS_MIN_DELAY,
)

/**
 * A gaplimit threshold at which a warning is displayed that with the given value a
 * decline in performance is to be expected. Importing 500 addresses (per jar!) leads to
 * the `/display` endpoint taking more than ~15s.
 */
export const GAPLIMIT_WARN_THRESHOLD = 250

export const TOTAL_COIN_SUPPLY: AmountSats = Number(
  (function () {
    const SATS_PER_COIN = 100_000_000n
    const INITIAL_SUBSIDY = 50n * SATS_PER_COIN
    const BLOCKS_PER_HALVING = 210_000n

    return () => {
      let subsidy = INITIAL_SUBSIDY
      let total = 0n
      let halving = 0n

      while (subsidy > 0n) {
        total += BLOCKS_PER_HALVING * subsidy
        subsidy = subsidy / 2n
        halving += 1n
        // Safety: break if loop would be infinite (not needed here but good practice)
        if (halving > 1_000n) break
      }

      return total
    }
  })()(),
)

export const MAX_NUM_COLLABORATORS = JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS
