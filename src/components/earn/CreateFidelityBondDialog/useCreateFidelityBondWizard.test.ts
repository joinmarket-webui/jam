import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { useCreateFidelityBondWizard } from './useCreateFidelityBondWizard'

const mocks = vi.hoisted(() => ({
  directSendMutateAsync: vi.fn(),
  freezeMutateAsync: vi.fn(),
  walletInfoRefetch: vi.fn(),
  toastSuccess: vi.fn(),
  walletInfo: {
    jars: [] as Jar[],
    fidelityBondSummary: { fbOutputs: [] as Utxo[] },
    refetch: vi.fn(),
  },
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  directsendMutation: vi.fn(() => ({ mutationKey: ['directsend'] })),
  freezeMutation: vi.fn(() => ({ mutationKey: ['freeze'] })),
  gettimelockaddressOptions: vi.fn(() => ({ queryKey: ['timelock-address'] })),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: { mutationKey?: string[] }) => ({
    mutateAsync: options.mutationKey?.[0] === 'directsend' ? mocks.directSendMutateAsync : mocks.freezeMutateAsync,
  })),
  useQuery: vi.fn(() => ({
    data: { address: 'bcrt1qtimelockdestination' },
    error: null,
    isFetching: false,
    isLoading: false,
  })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
  },
}))

vi.mock('@/context/JamWalletInfoContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/JamWalletInfoContext')>()),
  useJamWalletInfoContext: () => mocks.walletInfo,
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/store/jamSettingsStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/store/jamSettingsStore')>()),
  useDeveloperMode: () => ({ enabled: false }),
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

const jar = (jarIndex: number, utxos: Utxo[]): Jar =>
  ({
    jarIndex,
    name: `Jar ${jarIndex}`,
    color: '#808080',
    balanceSummary: {},
    utxos,
  }) as unknown as Jar

const lockdateFromWizard = (wizard: ReturnType<typeof useCreateFidelityBondWizard>) => {
  const lockdate = wizard.clampLockdate('1900-01')
  if (!lockdate) throw new Error('Expected a generated lockdate option')
  return lockdate
}

describe('useCreateFidelityBondWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.directSendMutateAsync.mockResolvedValue({ txid: 'created-tx' })
    mocks.freezeMutateAsync.mockResolvedValue(undefined)
    mocks.walletInfoRefetch.mockResolvedValue(undefined)
    mocks.walletInfo.refetch = mocks.walletInfoRefetch
    mocks.walletInfo.fidelityBondSummary = { fbOutputs: [] }
    mocks.walletInfo.jars = [
      jar(0, [
        utxo({ utxo: 'small:0', value: 10_000 }),
        utxo({ utxo: 'large:0', value: 50_000 }),
        utxo({ utxo: 'frozen:0', value: 75_000, frozen: true }),
        utxo({
          utxo: 'bond:0',
          value: 100_000,
          locktime: '2999-01-01 00:00:00',
          path: "m/84'/1'/0'/0/3:32503680000",
        }),
      ]),
      jar(1, [utxo({ utxo: 'other:0', mixdepth: 1, value: 20_000 })]),
    ]
  })

  it('derives selectable utxos and selection totals from wallet state', async () => {
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    act(() => result.current.setSelectedJarIndex(0))

    expect(result.current.availableUtxos.map((entry) => entry.utxo)).toEqual(['large:0', 'small:0'])

    act(() => result.current.selectAllUtxos())

    expect(result.current.selectedUtxos.map((entry) => entry.utxo)).toEqual(['large:0', 'small:0'])
    expect(result.current.totalAmount).toBe(60_000)
    expect(result.current.utxosToFreeze.map((entry) => entry.utxo)).toEqual([])
    expect(result.current.isUsingAllFunds).toBe(false)

    act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))

    expect(result.current.selectedUtxos.map((entry) => entry.utxo)).toEqual(['small:0'])
    expect(result.current.utxosToFreeze.map((entry) => entry.utxo)).toEqual(['large:0'])

    act(() => result.current.deselectAllUtxos())

    await waitFor(() => expect(result.current.selectedUtxos).toHaveLength(0))
  })

  it('skips jar selection when only one jar has eligible utxos', async () => {
    mocks.walletInfo.jars = [jar(0, [utxo({ utxo: 'only:0', value: 25_000 })])]
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))
    const lockdate = lockdateFromWizard(result.current)

    act(() => result.current.setSelectedLockdate(lockdate))
    await act(async () => result.current.handleNext())

    expect(result.current.step).toBe('select_utxos')
    expect(result.current.selectedJarIndex).toBe(0)

    act(() => result.current.selectAllUtxos())
    await act(async () => result.current.handleNext())

    expect(result.current.step).toBe('review')

    act(() => result.current.setConfirmationChecked(true))
    await act(async () => result.current.handleNext())

    expect(mocks.directSendMutateAsync).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
      body: {
        mixdepth: 0,
        amount_sats: 0,
        destination: 'bcrt1qtimelockdestination',
      },
    })
    expect(result.current.step).toBe('success')
    expect(result.current.txResult).toEqual({ txid: 'created-tx' })
    expect(mocks.walletInfoRefetch).toHaveBeenCalled()
    expect(mocks.toastSuccess).toHaveBeenCalledWith('earn.fidelity_bond.create_fidelity_bond.success_text')
  })

  it('freezes unselected utxos before review and supports back navigation', async () => {
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))
    const lockdate = lockdateFromWizard(result.current)

    act(() => result.current.setSelectedLockdate(lockdate))
    await act(async () => result.current.handleNext())
    expect(result.current.step).toBe('select_jar')

    act(() => result.current.setSelectedJarIndex(0))
    await act(async () => result.current.handleNext())
    expect(result.current.step).toBe('select_utxos')

    act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
    await act(async () => result.current.handleNext())
    expect(result.current.step).toBe('freeze_utxos')

    await act(async () => result.current.handleNext())

    expect(mocks.freezeMutateAsync).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
      body: { 'utxo-string': 'small:0', freeze: true },
    })
    expect(result.current.step).toBe('review')
    expect(result.current.frozenUtxos.map((entry) => entry.utxo)).toEqual(['small:0'])

    act(() => result.current.handleBack())

    expect(result.current.step).toBe('freeze_utxos')
  })

  it('resets transient state when the dialog closes', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, onOpenChange, 'wallet.jmdat'))

    act(() => {
      result.current.setStep('success')
      result.current.setSelectedJarIndex(0)
      result.current.selectAllUtxos()
      result.current.handleOpenChange(false)
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(result.current.step).toBe('select_date')
    expect(result.current.selectedJarIndex).toBeUndefined()
    expect(result.current.selectedUtxos).toEqual([])
    expect(result.current.txResult).toBeUndefined()
  })
})
