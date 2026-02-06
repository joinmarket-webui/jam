import type { AmountSats, Milliseconds } from '@/types/global'
import { parseAsIntOrDefault } from './meta-env-utils'

export const JM_WALLET_FILE_EXTENSION = '.jmdat'

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

export const JM_MAX_SWEEP_FEE_CHANGE_DEFAULT = 0.8

export const JM_DUST_THRESHOLD: AmountSats = 27_300

// initial value for `minimum_makers` from the default joinmarket.cfg (last check on 2022-02-20 of v0.9.5)
export const JM_MINIMUM_MAKERS_DEFAULT = 4

// only support starting the maker with native segwit offers
type RelativeOfferType = 'sw0reloffer'
type AbsoluteOfferType = 'sw0absoffer'
export type OfferType = RelativeOfferType | AbsoluteOfferType | string

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

export type TxFeeUnit = 'blocks' | 'sats/kilo-vbyte'

export const txFeeUnit = {
  BLOCKS: 'blocks' as TxFeeUnit,
  SATS_PER_KILO_VBYTE: 'sats/kilo-vbyte' as TxFeeUnit,
}
