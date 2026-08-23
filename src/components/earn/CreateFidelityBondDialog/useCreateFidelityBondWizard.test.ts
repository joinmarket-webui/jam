import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { BALANCE_SUMMARY_EMPTY } from '@/lib/balanceSummary'
import { generateLockdateOptions } from './types'
import { useCreateFidelityBondWizard } from './useCreateFidelityBondWizard'

const mocks = vi.hoisted(() => {
  const addressSummary: Record<string, { status: string }> = {
    bcrt1qsource: { status: 'cj-out' },
  }
  return {
    directSendMutateAsync: vi.fn(),
    freezeMutateAsync: vi.fn(),
    walletInfoRefetch: vi.fn(),
    toastSuccess: vi.fn(),
    queryAddress: undefined as string | undefined,
    isDeveloperMode: false,
    walletInfo: {
      jars: [] as Jar[],
      fidelityBondSummary: { fbOutputs: [] as Utxo[] },
      addressSummary,
      refetch: vi.fn(),
    },
  }
})

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  directsendMutation: vi.fn(() => ({ mutationKey: ['directsend'] })),
  freezeMutation: vi.fn(() => ({ mutationKey: ['freeze'] })),
  gettimelockaddressOptions: vi.fn(() => ({ queryKey: ['timelock-address'] })),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: { mutationKey?: string[] }) => ({
    mutateAsync: options.mutationKey?.[0] === 'directsend' ? mocks.directSendMutateAsync : mocks.freezeMutateAsync,
  })),
  useQuery: vi.fn(() => ({
    data: mocks.queryAddress === undefined ? undefined : { address: mocks.queryAddress },
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
  useDeveloperMode: () => ({ enabled: mocks.isDeveloperMode }),
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
    balanceSummary: BALANCE_SUMMARY_EMPTY,
    utxos,
  }) as unknown as Jar

const minLockdateOption = (isDeveloperMode = false) => {
  const lockdate = generateLockdateOptions(isDeveloperMode).at(0)?.value
  if (!lockdate) throw new Error('Expected a generated lockdate option')
  return lockdate
}

const submitFromReview = async (result: { current: ReturnType<typeof useCreateFidelityBondWizard> }) => {
  act(() => result.current.setSelectedLockdate(minLockdateOption()))
  act(() => result.current.setSelectedJarIndex(0))
  act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
  act(() => result.current.setStep('freeze_utxos'))
  await act(async () => result.current.handleNext())
  expect(result.current.step).toBe('review')

  act(() => result.current.setConfirmationChecked(true))
  await act(async () => result.current.handleNext())
}

describe('useCreateFidelityBondWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.directSendMutateAsync.mockResolvedValue({ txid: 'created-tx' })
    mocks.freezeMutateAsync.mockResolvedValue(undefined)
    mocks.walletInfoRefetch.mockResolvedValue(undefined)
    mocks.walletInfo.refetch = mocks.walletInfoRefetch
    mocks.queryAddress = 'bcrt1qtimelockdestination'
    mocks.isDeveloperMode = false
    mocks.walletInfo.fidelityBondSummary = { fbOutputs: [] }
    mocks.walletInfo.addressSummary = {
      bcrt1qsource: { status: 'cj-out' },
    }
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

  it('derives selectable utxos and keeps selection to one utxo', async () => {
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    act(() => result.current.setSelectedJarIndex(0))

    expect(result.current.availableUtxos.map((entry) => entry.utxo)).toEqual(['large:0', 'small:0'])

    act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))

    expect(result.current.selectedUtxos.map((entry) => entry.utxo)).toEqual(['large:0'])
    expect(result.current.totalAmount).toBe(50_000)
    expect(result.current.utxosToFreeze.map((entry) => entry.utxo)).toEqual(['small:0'])
    expect(result.current.isUsingAllFunds).toBe(false)

    act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[1]))

    expect(result.current.selectedUtxos.map((entry) => entry.utxo)).toEqual(['small:0'])
    expect(result.current.utxosToFreeze.map((entry) => entry.utxo)).toEqual(['large:0'])

    act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[1]))

    await waitFor(() => expect(result.current.selectedUtxos).toHaveLength(0))
  })

  it('skips jar selection when only one jar has eligible utxos', async () => {
    mocks.walletInfo.jars = [jar(0, [utxo({ utxo: 'only:0', value: 25_000 })])]
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))
    const lockdate = minLockdateOption()

    act(() => result.current.setSelectedLockdate(lockdate))
    await act(async () => result.current.handleNext())

    expect(result.current.step).toBe('select_utxos')
    expect(result.current.selectedJarIndex).toBe(0)

    act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
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
    const lockdate = minLockdateOption()

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
    })
    act(() => {
      result.current.toggleUtxoSelection(result.current.availableUtxos[0])
    })
    act(() => {
      result.current.handleOpenChange(false)
    })

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(result.current.step).toBe('select_date')
    expect(result.current.selectedJarIndex).toBeUndefined()
    expect(result.current.selectedUtxos).toEqual([])
    expect(result.current.txResult).toBeUndefined()
  })

  it('does not reset when the dialog opens', () => {
    const onOpenChange = vi.fn()
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, onOpenChange, 'wallet.jmdat'))

    act(() => {
      result.current.setStep('review')
      result.current.handleOpenChange(true)
    })

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(result.current.step).toBe('review')
  })

  it('flags duplicate lockdates against existing fidelity bonds', () => {
    const lockdate = minLockdateOption()
    const timestampSeconds = Math.floor(new Date(`${lockdate}-01T00:00:00Z`).getTime() / 1000)

    mocks.walletInfo.fidelityBondSummary = {
      fbOutputs: [
        utxo({
          utxo: 'existing-bond:0',
          value: 100_000,
          locktime: '2999-01-01 00:00:00',
          path: `m/84'/1'/0'/0/0:${timestampSeconds}`,
        }),
      ],
    }

    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    expect(result.current.hasDuplicateLockdate).toBeFalsy()
    act(() => result.current.setSelectedLockdate(lockdate))
    expect(result.current.hasDuplicateLockdate).toBe(true)
    expect(result.current.canProceed()).toBe(false)
  })

  it('blocks a lock date already used by an expired fidelity bond', () => {
    mocks.isDeveloperMode = true
    const expiredLockdate = minLockdateOption(true)
    const timestampSeconds = Math.floor(new Date(`${expiredLockdate}-01T00:00:00Z`).getTime() / 1000)

    mocks.walletInfo.fidelityBondSummary = {
      fbOutputs: [
        utxo({
          utxo: 'expired-bond:0',
          value: 100_000,
          locktime: `${expiredLockdate}-01 00:00:00`,
          path: `m/84'/1'/0'/0/0:${timestampSeconds}`,
        }),
      ],
    }

    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    expect(result.current.existingFbLockdates).toContain(expiredLockdate)
    act(() => result.current.setSelectedLockdate(expiredLockdate))
    expect(result.current.hasDuplicateLockdate).toBe(true)
    expect(result.current.canProceed()).toBe(false)
  })

  it('ignores existing fidelity bonds whose locktime cannot be derived', () => {
    mocks.walletInfo.fidelityBondSummary = {
      fbOutputs: [
        // locked (far-future locktime) but the path carries no parseable timestamp
        utxo({
          utxo: 'malformed-bond:0',
          value: 100_000,
          locktime: '2999-01-01 00:00:00',
          path: "m/84'/1'/0'/0/0",
        }),
      ],
    }

    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))
    const lockdate = minLockdateOption()

    act(() => result.current.setSelectedLockdate(lockdate))
    expect(result.current.hasDuplicateLockdate).toBeFalsy()
  })

  it('drops selected utxo ids that are no longer available', async () => {
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    act(() => result.current.setSelectedJarIndex(0))
    act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
    expect(result.current.selectedUtxos.map((entry) => entry.utxo)).toEqual(['large:0'])

    // switch to a jar that does not contain the previously selected ids
    act(() => result.current.setSelectedJarIndex(1))

    await waitFor(() => expect(result.current.selectedUtxos).toEqual([]))
  })

  it('only exposes unfrozen cj-out utxos for fidelity-bond creation', () => {
    mocks.walletInfo.addressSummary = {
      bcrt1qcj: { status: 'cj-out' },
      bcrt1qdeposit: { status: 'deposit' },
    }
    mocks.walletInfo.jars = [
      jar(0, [utxo({ utxo: 'cj:0', address: 'bcrt1qcj' }), utxo({ utxo: 'deposit:0', address: 'bcrt1qdeposit' })]),
      jar(1, [utxo({ utxo: 'deposit-only:0', address: 'bcrt1qdeposit', mixdepth: 1 })]),
    ]

    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    expect(result.current.jarsWithUtxos.map((entry) => entry.jarIndex)).toEqual([0])
    act(() => result.current.setSelectedJarIndex(0))
    expect(result.current.availableUtxos.map((entry) => entry.utxo)).toEqual(['cj:0'])
  })

  it('reflects canProceed gating for each step', () => {
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))
    const lockdate = minLockdateOption()

    // select_date
    expect(result.current.canProceed()).toBe(false)
    act(() => result.current.setSelectedLockdate(lockdate))
    expect(result.current.canProceed()).toBe(true)

    // select_jar
    act(() => result.current.setStep('select_jar'))
    expect(result.current.canProceed()).toBe(false)
    act(() => result.current.setSelectedJarIndex(0))
    expect(result.current.canProceed()).toBe(true)

    // select_utxos
    act(() => result.current.setStep('select_utxos'))
    expect(result.current.canProceed()).toBe(false)
    act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
    expect(result.current.canProceed()).toBe(true)

    // freeze_utxos always proceeds
    act(() => result.current.setStep('freeze_utxos'))
    expect(result.current.canProceed()).toBe(true)

    // review needs confirmation and an address
    act(() => result.current.setStep('review'))
    expect(result.current.canProceed()).toBe(false)
    act(() => result.current.setConfirmationChecked(true))
    expect(result.current.canProceed()).toBe(true)

    // unknown step falls through to default
    act(() => result.current.setStep('creating'))
    expect(result.current.canProceed()).toBe(false)
  })

  it('blocks review when no timelock address is available', () => {
    mocks.queryAddress = undefined
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    act(() => {
      result.current.setStep('review')
      result.current.setConfirmationChecked(true)
    })

    expect(result.current.address).toBeUndefined()
    expect(result.current.canProceed()).toBe(false)
  })

  it('does not submit a fidelity bond without an address or selected jar', async () => {
    mocks.queryAddress = undefined
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    await act(async () => result.current.handleCreateFidelityBond())

    expect(mocks.directSendMutateAsync).not.toHaveBeenCalled()
    expect(result.current.step).toBe('select_date')
  })

  it('reports step numbers in wizard order', () => {
    const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

    expect(result.current.getStepNumber()).toBe(0)
    act(() => result.current.setStep('select_jar'))
    expect(result.current.getStepNumber()).toBe(1)
    act(() => result.current.setStep('review'))
    expect(result.current.getStepNumber()).toBe(4)
  })

  describe('handleNext validation guards', () => {
    it('stays on select_date when the lockdate is invalid', async () => {
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      await act(async () => result.current.handleNext())

      expect(result.current.step).toBe('select_date')
    })

    it('stays on select_jar when no jar is chosen', async () => {
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setStep('select_jar'))
      await act(async () => result.current.handleNext())

      expect(result.current.step).toBe('select_jar')
    })

    it('stays on select_utxos when nothing is selected', async () => {
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setSelectedJarIndex(0))
      act(() => result.current.setStep('select_utxos'))
      await act(async () => result.current.handleNext())

      expect(result.current.step).toBe('select_utxos')
    })

    it('skips freezing and moves straight to review when the selected utxo is the only one in the jar', async () => {
      mocks.walletInfo.jars = [jar(0, [utxo({ utxo: 'only:0', value: 25_000 })])]
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))
      const lockdate = minLockdateOption()

      act(() => result.current.setSelectedLockdate(lockdate))
      await act(async () => result.current.handleNext())
      expect(result.current.step).toBe('select_utxos')

      act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
      await act(async () => result.current.handleNext())

      expect(result.current.step).toBe('review')
      expect(result.current.utxosToFreeze).toEqual([])
    })

    it('blocks review submission when the form is invalid', async () => {
      mocks.walletInfo.jars = [jar(0, [utxo({ utxo: 'only:0', value: 25_000 })])]
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setSelectedJarIndex(0))
      act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
      act(() => result.current.setStep('review'))
      // confirmation not accepted -> trigger() fails the whole form
      await act(async () => result.current.handleNext())

      expect(mocks.directSendMutateAsync).not.toHaveBeenCalled()
      expect(result.current.step).toBe('review')
    })
  })

  describe('handleBack navigation', () => {
    it('returns from select_jar to select_date', () => {
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setStep('select_jar'))
      act(() => result.current.handleBack())

      expect(result.current.step).toBe('select_date')
    })

    it('returns from select_utxos to select_jar when several jars are eligible', () => {
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setSelectedJarIndex(0))
      act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
      act(() => result.current.setStep('select_utxos'))
      act(() => result.current.handleBack())

      expect(result.current.step).toBe('select_jar')
      expect(result.current.selectedJarIndex).toBe(0)
      expect(result.current.selectedUtxos).toEqual([])
    })

    it('returns from select_utxos to select_date when only one jar is eligible', () => {
      mocks.walletInfo.jars = [jar(0, [utxo({ utxo: 'only:0', value: 25_000 })])]
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setSelectedJarIndex(0))
      act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
      act(() => result.current.setStep('select_utxos'))
      act(() => result.current.handleBack())

      expect(result.current.step).toBe('select_date')
      expect(result.current.selectedJarIndex).toBeUndefined()
      expect(result.current.selectedUtxos).toEqual([])
    })

    it('returns from freeze_utxos to select_utxos', () => {
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setStep('freeze_utxos'))
      act(() => result.current.handleBack())

      expect(result.current.step).toBe('select_utxos')
    })

    it('returns from review to select_utxos when nothing was frozen', () => {
      mocks.walletInfo.jars = [jar(0, [utxo({ utxo: 'only:0', value: 25_000 })])]
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setSelectedJarIndex(0))
      act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
      act(() => result.current.setStep('review'))
      expect(result.current.utxosToFreeze).toEqual([])
      act(() => result.current.handleBack())

      expect(result.current.step).toBe('select_utxos')
    })

    it('returns from review to freeze_utxos when utxos remain to be frozen', () => {
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      act(() => result.current.setSelectedJarIndex(0))
      act(() => result.current.toggleUtxoSelection(result.current.availableUtxos[0]))
      act(() => result.current.setStep('review'))
      expect(result.current.utxosToFreeze.length).toBeGreaterThan(0)
      act(() => result.current.handleBack())

      expect(result.current.step).toBe('freeze_utxos')
    })
  })

  describe('bond creation failures', () => {
    it('stays on the success step when the wallet refetch after the broadcast fails', async () => {
      mocks.walletInfoRefetch.mockRejectedValue(new Error('refetch failed'))
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      await submitFromReview(result)

      expect(mocks.directSendMutateAsync).toHaveBeenCalled()
      expect(result.current.step).toBe('success')
      expect(result.current.txResult).toEqual({ txid: 'created-tx' })
      expect(mocks.toastSuccess).toHaveBeenCalledWith('earn.fidelity_bond.create_fidelity_bond.success_text')
    })

    it('rolls back to the freeze step when the send itself fails', async () => {
      mocks.directSendMutateAsync.mockRejectedValue(new Error('broadcast failed'))
      const { result } = renderHook(() => useCreateFidelityBondWizard(true, vi.fn(), 'wallet.jmdat'))

      await submitFromReview(result)

      expect(result.current.step).toBe('freeze_utxos')
      expect(result.current.txResult).toBeUndefined()
      expect(result.current.frozenUtxos).toEqual([])
      expect(mocks.walletInfoRefetch).not.toHaveBeenCalled()
    })
  })
})
