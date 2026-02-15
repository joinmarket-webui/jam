export interface FeeConfigValues {
  max_cj_fee_abs?: string
  max_cj_fee_rel?: string
  tx_fees?: string
  tx_fees_factor?: string
  max_sweep_fee_change?: string
}

export const isMaxFeesConfigMissing = (values: FeeConfigValues | undefined): boolean => {
  return !!values && (values.max_cj_fee_abs === undefined || values.max_cj_fee_rel === undefined)
}
