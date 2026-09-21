import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { FidelityBondUtxo, Utxo } from '@/hooks/useQueryUtxos'
import { BALANCE_SUMMARY_EMPTY } from '@/lib/balanceSummary'
import { useFidelityBondSweep } from './useFidelityBondSweep'

const mocks = vi.hoisted(() => ({
  freezeMutateAsync: vi.fn(),
  unfreezeMutateAsync: vi.fn(),
  directSendMutateAsync: vi.fn(),
  setError: vi.fn(),
  walletInfoRefetch: vi.fn(),
  walletInfo: {
    jars: [] as Jar[],
    refetch: vi.fn(),
  },
}))

// `useFidelityBondSweep` only talks to the network through these two hooks —
// mock at that boundary and let the hook's own orchestration logic run for real.
vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: { mutationFn: (variables: unknown) => Promise<unknown> }) => ({
    mutateAsync: options.mutationFn,
    isPending: false,
  })),
}))

vi.mock('./useFidelityBondMutations', () => ({
  useFidelityBondMutations: () => ({
    freezeUtxo: { mutateAsync: mocks.freezeMutateAsync },
    unfreezeUtxo: { mutateAsync: mocks.unfreezeMutateAsync },
    directSend: { mutateAsync: mocks.directSendMutateAsync },
    error: undefined,
    setError: mocks.setError,
  }),
}))

vi.mock('@/context/JamWalletInfoContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/JamWalletInfoContext')>()),
  useJamWalletInfoContext: () => mocks.walletInfo,
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  delayedPromise: vi.fn(() => Promise.resolve()),
}))

const utxo = (overrides: Partial<Utxo>): Utxo => ({
  utxo: 'tx:0',
  address: 'bcrt1qsource',
  path: "m/84'/1'/0'/0/0",
  label: '',
  value: 100_000,
  tries: 0,
  tries_remaining: 3,
  external: false,
  mixdepth: 0,
  confirmations: 6,
  frozen: false,
  locktime: undefined,
  ...overrides,
})

const bondUtxo = (overrides: Partial<FidelityBondUtxo>): FidelityBondUtxo => ({
  ...utxo({ utxo: 'bond:0', frozen: true, ...overrides }),
  locktime: '2999-01-01 00:00:00',
})

const jar = (jarIndex: number, utxos: Utxo[]): Jar =>
  ({
    jarIndex,
    name: `Jar ${jarIndex}`,
    color: '#808080',
    balanceSummary: BALANCE_SUMMARY_EMPTY,
    utxos,
  }) as unknown as Jar

describe('useFidelityBondSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.freezeMutateAsync.mockResolvedValue(undefined)
    mocks.unfreezeMutateAsync.mockResolvedValue(undefined)
    mocks.walletInfoRefetch.mockResolvedValue(undefined)
    mocks.walletInfo.refetch = mocks.walletInfoRefetch
  })

  it('re-freezes the fidelity bond after a failed sweep that had unfrozen it', async () => {
    const bond = bondUtxo({ mixdepth: 0 })
    const other = utxo({ utxo: 'other:0', mixdepth: 0, frozen: false })
    mocks.walletInfo.jars = [jar(0, [bond, other])]
    mocks.directSendMutateAsync.mockRejectedValue(new Error('broadcast failed'))

    const { result } = renderHook(() =>
      useFidelityBondSweep({
        walletFileName: 'wallet.jmdat',
        utxo: bond,
        unfreezeErrorKey: 'earn.fidelity_bond.error_unfreezing_utxos',
        sendErrorKey: 'earn.fidelity_bond.renew.error_renewing_fidelity_bond',
      }),
    )

    const txResult = await result.current.sweep({
      destination: 'bcrt1qdestination',
      tryFreezeAfterBroadcast: false,
    })

    expect(txResult).toBeUndefined()

    // other utxos in the jar are left alone - the sweep pins its input instead
    expect(mocks.freezeMutateAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ body: { 'utxo-string': 'other:0', freeze: true } }),
    )
    expect(mocks.unfreezeMutateAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ body: { 'utxo-string': 'other:0', freeze: false } }),
    )

    // the bond itself was unfrozen before the failed send, and MUST be re-frozen in rollback
    expect(mocks.unfreezeMutateAsync).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
      body: { 'utxo-string': 'bond:0', freeze: false },
    })
    expect(mocks.freezeMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ body: { 'utxo-string': 'bond:0', freeze: true } }),
    )
  })

  it('does not attempt to re-freeze the bond on failure when it was never unfrozen', async () => {
    const bond = bondUtxo({ mixdepth: 0, frozen: false })
    mocks.walletInfo.jars = [jar(0, [bond])]
    mocks.directSendMutateAsync.mockRejectedValue(new Error('broadcast failed'))

    const { result } = renderHook(() =>
      useFidelityBondSweep({
        walletFileName: 'wallet.jmdat',
        utxo: bond,
        unfreezeErrorKey: 'earn.fidelity_bond.error_unfreezing_utxos',
        sendErrorKey: 'earn.fidelity_bond.renew.error_renewing_fidelity_bond',
      }),
    )

    await result.current.sweep({ destination: 'bcrt1qdestination', tryFreezeAfterBroadcast: false })

    expect(mocks.unfreezeMutateAsync).not.toHaveBeenCalled()
    expect(mocks.freezeMutateAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ body: { 'utxo-string': 'bond:0', freeze: true } }),
    )
  })

  it('sweeps successfully: unfreezes the bond and spends exactly that utxo', async () => {
    const bond = bondUtxo({ mixdepth: 0 })
    const other = utxo({ utxo: 'other:0', mixdepth: 0, frozen: false })
    mocks.walletInfo.jars = [jar(0, [bond, other])]
    mocks.directSendMutateAsync.mockResolvedValue({ txinfo: { txid: 'renewed-tx' } })

    const { result } = renderHook(() =>
      useFidelityBondSweep({
        walletFileName: 'wallet.jmdat',
        utxo: bond,
        unfreezeErrorKey: 'earn.fidelity_bond.error_unfreezing_utxos',
        sendErrorKey: 'earn.fidelity_bond.renew.error_renewing_fidelity_bond',
      }),
    )

    const txResult = await result.current.sweep({
      destination: 'bcrt1qdestination',
      tryFreezeAfterBroadcast: false,
    })

    expect(txResult).toEqual({ txinfo: { txid: 'renewed-tx' } })
    expect(mocks.directSendMutateAsync).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
      body: { mixdepth: 0, amount_sats: 0, destination: 'bcrt1qdestination', input_utxos: ['bond:0'] },
    })
    // only the bond is unfrozen; the other utxo is never touched
    expect(mocks.unfreezeMutateAsync).toHaveBeenCalledTimes(1)
    expect(mocks.unfreezeMutateAsync).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
      body: { 'utxo-string': 'bond:0', freeze: false },
    })
    expect(mocks.freezeMutateAsync).not.toHaveBeenCalled()
    expect(mocks.walletInfoRefetch).toHaveBeenCalled()
  })

  it('does not re-freeze the bond if the sweep broadcast but the refetch after it fails', async () => {
    const bond = bondUtxo({ mixdepth: 0 })
    mocks.walletInfo.jars = [jar(0, [bond])]
    mocks.directSendMutateAsync.mockResolvedValue({ txinfo: { txid: 'renewed-tx' } })
    mocks.walletInfoRefetch.mockRejectedValue(new Error('refetch failed'))

    const { result } = renderHook(() =>
      useFidelityBondSweep({
        walletFileName: 'wallet.jmdat',
        utxo: bond,
        unfreezeErrorKey: 'earn.fidelity_bond.error_unfreezing_utxos',
        sendErrorKey: 'earn.fidelity_bond.renew.error_renewing_fidelity_bond',
      }),
    )

    const txResult = await result.current.sweep({
      destination: 'bcrt1qdestination',
      tryFreezeAfterBroadcast: false,
    })

    expect(txResult).toEqual({ txinfo: { txid: 'renewed-tx' } })
    expect(mocks.freezeMutateAsync).not.toHaveBeenCalledWith(
      expect.objectContaining({ body: { 'utxo-string': 'bond:0', freeze: true } }),
    )
  })

  it('does not spend a utxo that arrived in the jar after the dialog was opened', async () => {
    const bond = bondUtxo({ mixdepth: 0 })
    const other = utxo({ utxo: 'other:0', mixdepth: 0, frozen: false })
    mocks.walletInfo.jars = [jar(0, [bond, other])]

    // a deposit lands in the jar while the bond is being unfrozen, i.e. after
    // any snapshot the hook could have taken of the jar
    const arriving = utxo({ utxo: 'deposit:0', mixdepth: 0, frozen: false })
    mocks.unfreezeMutateAsync.mockImplementation(() => {
      mocks.walletInfo.jars = [jar(0, [bond, other, arriving])]
      return Promise.resolve()
    })
    mocks.directSendMutateAsync.mockResolvedValue({ txinfo: { txid: 'renewed-tx' } })

    const { result } = renderHook(() =>
      useFidelityBondSweep({
        walletFileName: 'wallet.jmdat',
        utxo: bond,
        unfreezeErrorKey: 'earn.fidelity_bond.error_unfreezing_utxos',
        sendErrorKey: 'earn.fidelity_bond.renew.error_renewing_fidelity_bond',
      }),
    )

    await result.current.sweep({ destination: 'bcrt1qdestination', tryFreezeAfterBroadcast: false })

    // the request names the bond and nothing else - the backend cannot pick the deposit
    expect(mocks.directSendMutateAsync).toHaveBeenCalledTimes(1)
    expect(mocks.directSendMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        body: { mixdepth: 0, amount_sats: 0, destination: 'bcrt1qdestination', input_utxos: ['bond:0'] },
      }),
    )
  })

  it('does not broadcast when the bond is no longer in the jar', async () => {
    const bond = bondUtxo({ mixdepth: 0 })
    mocks.walletInfo.jars = [jar(0, [utxo({ utxo: 'other:0', mixdepth: 0 })])]

    const { result } = renderHook(() =>
      useFidelityBondSweep({
        walletFileName: 'wallet.jmdat',
        utxo: bond,
        unfreezeErrorKey: 'earn.fidelity_bond.error_unfreezing_utxos',
        sendErrorKey: 'earn.fidelity_bond.renew.error_renewing_fidelity_bond',
      }),
    )

    const txResult = await result.current.sweep({ destination: 'bcrt1qdestination', tryFreezeAfterBroadcast: false })

    expect(txResult).toBeUndefined()
    expect(mocks.unfreezeMutateAsync).not.toHaveBeenCalled()
    expect(mocks.directSendMutateAsync).not.toHaveBeenCalled()
    expect(mocks.setError).toHaveBeenLastCalledWith('earn.fidelity_bond.error_bond_not_in_jar')
  })
})
