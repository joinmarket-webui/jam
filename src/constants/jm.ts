export const JM_API_AUTH_TOKEN_EXPIRY = parseInt(import.meta.env.VITE_JM_API_AUTH_TOKEN_EXPIRY_SECONDS, 10) * 1_000

export const JM_MAX_SWEEP_FEE_CHANGE_DEFAULT = 0.8

export const JM_DUST_THRESHOLD = 27_300

// only support starting the maker with native segwit offers
type RelOfferType = 'sw0reloffer'
type AbsOfferType = 'sw0absoffer'
export type OfferType = RelOfferType | AbsOfferType | string

type SectionKey = string

interface ConfigKey {
  section: SectionKey
  field: string
}

export const FEE_CONFIG_KEYS: Record<string, ConfigKey> = {
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
