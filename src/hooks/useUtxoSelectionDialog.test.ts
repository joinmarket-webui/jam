import type { RowSelectionState } from '@tanstack/react-table'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { useUtxoSelectionDialog } from './useUtxoSelectionDialog'

const mocks = vi.hoisted(() => ({
  freezeOrUnfreeze: vi.fn(),
  walletInfoRefetch: vi.fn(),
  toastDismiss: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  freezeMutation: vi.fn(() => ({})),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options?: { mutationFn?: (variables: unknown) => Promise<unknown> }) => {
    if (options?.mutationFn) {
      return { mutateAsync: options.mutationFn, isPending: false }
    }
    return { mutateAsync: mocks.freezeOrUnfreeze, isPending: false }
  }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number }) => (values?.count === undefined ? key : `${key}:${values.count}`),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    dismiss: mocks.toastDismiss,
    success: mocks.toastSuccess,
    warning: mocks.toastWarning,
  },
}))

vi.mock('@/context/JamWalletInfoContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/JamWalletInfoContext')>()),
  useJamWalletInfoContext: () => ({ refetch: mocks.walletInfoRefetch }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

const utxo = (overrides: Partial<Utxo>): Utxo => ({
  utxo: 'tx:0',
  address: 'bcrt1qaddress',
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

const addressSummary: AddressSummary = {
  bcrt1qaddressa: { status: 'cj-out' },
  bcrt1qaddressb: { status: 'change-out' },
} as unknown as AddressSummary

const sourceJar = {
  jarIndex: 0,
  name: 'Apricot',
  color: '#e2b86a',
  balanceSummary: {},
  utxos: [
    utxo({ utxo: 'a:0', address: 'bcrt1qaddressa', frozen: false, label: 'keep together' }),
    utxo({ utxo: 'a:1', address: 'bcrt1qaddressa', frozen: true }),
    utxo({ utxo: 'b:0', address: 'bcrt1qaddressb', frozen: false }),
    utxo({
      utxo: 'fb:0',
      address: 'bcrt1qaddressfb',
      locktime: '2999-01-01 00:00:00',
      path: "m/84'/1'/0'/0/9:32503680000",
    }),
  ],
} as unknown as Jar

describe('useUtxoSelectionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.freezeOrUnfreeze.mockResolvedValue(undefined)
    mocks.walletInfoRefetch.mockResolvedValue(undefined)
  })

  it('keeps the selector disabled when no source jar is available', () => {
    const { result } = renderHook(() =>
      useUtxoSelectionDialog({
        walletFileName: 'wallet.jmdat',
        sourceJar: undefined,
        addressSummary,
      }),
    )

    expect(result.current.utxoSelectorDisabled).toBe(true)
    expect(result.current.dialogProps.open).toBe(false)

    act(() => result.current.onOpenUtxoSelector())

    expect(result.current.dialogProps.open).toBe(false)
  })

  it('opens with spendable non-fidelity-bond utxos selected', () => {
    const { result } = renderHook(() =>
      useUtxoSelectionDialog({
        walletFileName: 'wallet.jmdat',
        sourceJar,
        addressSummary,
      }),
    )

    act(() => result.current.onOpenUtxoSelector())

    expect(mocks.toastDismiss).toHaveBeenCalledWith('send.utxo.selection_changed_automatically')
    expect(result.current.dialogProps.open).toBe(true)
    expect(result.current.dialogProps.initialRowSelection).toEqual({ 'a:0': true, 'b:0': true })
    expect(result.current.dialogProps.selectedCount).toBe(2)
    expect(result.current.dialogProps.tableEntries.map((entry) => entry.utxo.utxo)).toEqual([
      'a:0',
      'a:1',
      'b:0',
      'fb:0',
    ])
  })

  it('freezes deselected addresses and unfreezes grouped selected addresses', async () => {
    const { result } = renderHook(() =>
      useUtxoSelectionDialog({
        walletFileName: 'wallet.jmdat',
        sourceJar,
        addressSummary,
      }),
    )

    act(() => result.current.onOpenUtxoSelector())
    act(() => result.current.dialogProps.onRowSelectionChange?.({ 'a:0': true } as RowSelectionState))
    await act(async () => result.current.dialogProps.onSubmit())

    expect(mocks.toastWarning).toHaveBeenCalledWith(
      'jar_details.utxo_list.toast_auto_selection_title',
      expect.objectContaining({
        description: 'jar_details.utxo_list.toast_auto_selected_matching:1',
      }),
    )
    expect(mocks.freezeOrUnfreeze).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
      body: { 'utxo-string': 'b:0', freeze: true },
    })
    expect(mocks.freezeOrUnfreeze).toHaveBeenCalledWith({
      path: { walletname: 'wallet.jmdat' },
      body: { 'utxo-string': 'a:1', freeze: false },
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('jar_details.utxo_list.toast_freeze_success:1')
    expect(mocks.toastSuccess).toHaveBeenCalledWith('jar_details.utxo_list.toast_unfreeze_success:1')
    await waitFor(() => expect(result.current.dialogProps.open).toBe(false))
  })

  it('closes without mutations when selection does not change freeze state', async () => {
    const jarWithoutFrozenGroupedUtxos = {
      ...sourceJar,
      utxos: sourceJar.utxos.filter((entry) => entry.utxo !== 'a:1'),
    }
    const { result } = renderHook(() =>
      useUtxoSelectionDialog({
        walletFileName: 'wallet.jmdat',
        sourceJar: jarWithoutFrozenGroupedUtxos,
        addressSummary,
      }),
    )

    act(() => result.current.onOpenUtxoSelector())
    await act(async () => result.current.dialogProps.onSubmit())

    expect(mocks.freezeOrUnfreeze).not.toHaveBeenCalled()
    expect(mocks.walletInfoRefetch).not.toHaveBeenCalled()
    expect(result.current.dialogProps.open).toBe(false)
  })
})
