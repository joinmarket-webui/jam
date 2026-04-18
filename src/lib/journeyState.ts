export type JourneyState = 'loading' | 'empty' | 'needs_fee' | 'ready'

export type JourneyWalletState = {
  balanceSats?: number | null
}

export type JourneyFeeState = {
  feeConfigMissing: boolean
}

// Journey state is ordered from unavailable wallet data to actionable states.
// Empty comes before needs_fee because fee setup is not relevant without funds.
export function getJourneyState(wallet: JourneyWalletState | undefined, feeState: JourneyFeeState): JourneyState {
  const balanceSats = wallet?.balanceSats

  if (typeof balanceSats !== 'number' || !Number.isFinite(balanceSats) || balanceSats < 0) return 'loading'
  if (balanceSats === 0) return 'empty'
  if (feeState.feeConfigMissing) return 'needs_fee'
  return 'ready'
}
