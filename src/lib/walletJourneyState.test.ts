import { describe, expect, it } from 'vitest'
import { deriveWalletJourneyState, type WalletJourneyStateInput } from './walletJourneyState'

const buildInput = (overrides: Partial<WalletJourneyStateInput> = {}): WalletJourneyStateInput => ({
  isWalletLoading: false,
  isServiceLoading: false,
  walletName: 'Satoshi',
  hasServiceError: false,
  hasWalletError: false,
  walletTotalBalanceInSats: 100_000,
  walletAvailableBalanceInSats: 100_000,
  utxoConfirmations: [6],
  ...overrides,
})

describe('deriveWalletJourneyState', () => {
  it('returns loading while wallet data is loading', () => {
    const result = deriveWalletJourneyState(
      buildInput({
        isWalletLoading: true,
        hasServiceError: true,
        walletName: null,
      }),
    )

    expect(result).toBe('loading')
  })

  it('returns loading while service data is loading', () => {
    const result = deriveWalletJourneyState(buildInput({ isServiceLoading: true }))

    expect(result).toBe('loading')
  })

  it('returns service-offline when service query fails', () => {
    const result = deriveWalletJourneyState(buildInput({ hasServiceError: true }))

    expect(result).toBe('service-offline')
  })

  it('prioritizes service-offline over no-wallet to avoid ambiguous guidance', () => {
    const result = deriveWalletJourneyState(
      buildInput({
        hasServiceError: true,
        walletName: null,
      }),
    )

    expect(result).toBe('service-offline')
  })

  it('returns no-wallet when wallet name is missing', () => {
    const result = deriveWalletJourneyState(buildInput({ walletName: null }))

    expect(result).toBe('no-wallet')
  })

  it('returns action-required when wallet query fails', () => {
    const result = deriveWalletJourneyState(buildInput({ hasWalletError: true }))

    expect(result).toBe('action-required')
  })

  it('returns empty-wallet when total balance is zero', () => {
    const result = deriveWalletJourneyState(
      buildInput({
        walletTotalBalanceInSats: 0,
        walletAvailableBalanceInSats: 0,
        utxoConfirmations: [],
      }),
    )

    expect(result).toBe('empty-wallet')
  })

  it('returns awaiting-confirmation when balance exists but actionable balance is blocked by confirmations', () => {
    const result = deriveWalletJourneyState(
      buildInput({
        walletTotalBalanceInSats: 100_000,
        walletAvailableBalanceInSats: 0,
        utxoConfirmations: [1, 2],
      }),
    )

    expect(result).toBe('awaiting-confirmation')
  })

  it('returns action-required when balance exists but actionable balance is zero without confirmation blocker', () => {
    const result = deriveWalletJourneyState(
      buildInput({
        walletTotalBalanceInSats: 100_000,
        walletAvailableBalanceInSats: 0,
        utxoConfirmations: [10],
      }),
    )

    expect(result).toBe('action-required')
  })

  it('returns ready when wallet has actionable balance', () => {
    const result = deriveWalletJourneyState(
      buildInput({
        walletTotalBalanceInSats: 200_000,
        walletAvailableBalanceInSats: 100_000,
        utxoConfirmations: [1, 8],
      }),
    )

    expect(result).toBe('ready')
  })

  it('returns ready when some utxos are low-confirmation but actionable balance exists', () => {
    const result = deriveWalletJourneyState(
      buildInput({
        walletTotalBalanceInSats: 200_000,
        walletAvailableBalanceInSats: 50_000,
        utxoConfirmations: [1, 10],
      }),
    )

    expect(result).toBe('ready')
  })

  it('supports overriding minimum confirmations threshold', () => {
    const result = deriveWalletJourneyState(
      buildInput({
        walletTotalBalanceInSats: 100_000,
        walletAvailableBalanceInSats: 0,
        utxoConfirmations: [2],
        minConfirmationsForReady: 2,
      }),
    )

    expect(result).toBe('action-required')
  })
})
