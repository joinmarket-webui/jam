import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { BALANCE_SUMMARY_EMPTY } from '@/lib/balanceSummary'
import { MoveToJarDialog } from './MoveToJarDialog'

const h = vi.hoisted(() => ({
  getAddressCalls: [] as Array<{ url: string; path?: Record<string, string> }>,
  directSendCalls: [] as Array<{ url: string; body?: Record<string, unknown> }>,
  addressResponses: [
    'bcrt1q99999999999999999999999999999999999991',
    'bcrt1q99999999999999999999999999999999999992',
    'bcrt1q99999999999999999999999999999999999993',
    'bcrt1q99999999999999999999999999999999999994',
    'bcrt1q99999999999999999999999999999999999995',
  ],
  addressCallIndex: 0,
  addressFailure: null as Error | null,
  pendingAddressPromise: null as Promise<unknown> | null,
  walletJars: [] as Jar[],
  refetchWallet: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({
    get: vi.fn(async (options: { url: string; path?: Record<string, string> }) => {
      if (options.url.includes('/address/new/')) {
        h.getAddressCalls.push(options)
        if (h.pendingAddressPromise) {
          await h.pendingAddressPromise
        }
        if (h.addressFailure) {
          throw h.addressFailure
        }
        const address = h.addressResponses[h.addressCallIndex++] ?? `bcrt1qfallback${h.addressCallIndex}`
        return { data: { address } }
      }
      return { data: {} }
    }),
    post: vi.fn((options: { url: string; body?: Record<string, unknown> }) => {
      if (options.url.includes('/direct-send')) {
        h.directSendCalls.push(options)
        return Promise.resolve({ data: { txinfo: { txid: `txid_${h.directSendCalls.length}` } } })
      }
      if (options.url.includes('/freeze')) {
        return Promise.resolve({ data: {} })
      }
      return Promise.resolve({ data: {} })
    }),
    getConfig: () => ({ baseUrl: 'http://localhost:3000' }),
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    jars: h.walletJars,
    walletBalanceSummary: { calculatedTotalBalanceInSats: 200_000 },
    refetch: h.refetchWallet,
  }),
}))

vi.mock('@/components/ui/jam/SelectableJar', () => ({
  SelectableJar: ({
    name,
    onSelect,
    disabled,
    isSelected,
  }: {
    name?: string
    onSelect?: () => void
    disabled?: boolean
    isSelected?: boolean
  }) => (
    <button onClick={onSelect} disabled={disabled} data-selected={isSelected}>
      {name}
    </button>
  ),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange?.(false)}>close-dialog</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <div data-testid="address">{value}</div>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString} sats</span>,
}))

vi.mock('@/components/ui/jam/CopyButton', () => ({
  CopyButton: ({ value }: { value: string }) => <div data-testid="copy">{value}</div>,
}))

const bondA = {
  utxo: 'bondA_txid:0',
  value: 100_000,
  mixdepth: 0,
  confirmations: 10,
  address: 'bcrt1qbondA',
  frozen: false,
} as unknown as FidelityBondUtxo

const bondB = {
  utxo: 'bondB_txid:0',
  value: 100_000,
  mixdepth: 0,
  confirmations: 10,
  address: 'bcrt1qbondB',
  frozen: false,
} as unknown as FidelityBondUtxo

describe('MoveToJarDialog - Fresh Address Regression', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    h.getAddressCalls = []
    h.directSendCalls = []
    h.addressCallIndex = 0
    h.addressFailure = null
    h.pendingAddressPromise = null
    h.walletJars = [
      {
        jarIndex: 0,
        name: 'Jar 0',
        color: '#000',
        balanceSummary: BALANCE_SUMMARY_EMPTY,
        utxos: [
          { utxo: bondA.utxo, value: bondA.value, frozen: false },
          { utxo: bondB.utxo, value: bondB.value, frozen: false },
        ],
      } as unknown as Jar,
      {
        jarIndex: 1,
        name: 'Jar 1',
        color: '#111',
        balanceSummary: BALANCE_SUMMARY_EMPTY,
        utxos: [],
      } as unknown as Jar,
      {
        jarIndex: 2,
        name: 'Jar 2',
        color: '#222',
        balanceSummary: BALANCE_SUMMARY_EMPTY,
        utxos: [],
      } as unknown as Jar,
    ]
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  it('allocates distinct fresh addresses when moving separate bonds to the same destination jar', async () => {
    // Operation 1: Move bond A to Jar 1
    const onOpenChange1 = vi.fn()
    const view1 = render(
      <QueryClientProvider client={queryClient}>
        <MoveToJarDialog open onOpenChange={onOpenChange1} walletFileName="test.jmdat" utxo={bondA} />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByText('Jar 1'))
    fireEvent.click(screen.getByText('global.next'))

    await waitFor(() => {
      expect(screen.getByText(h.addressResponses[0])).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('earn.fidelity_bond.move.text_button_submit'))

    await waitFor(() => {
      expect(screen.getByText('earn.fidelity_bond.move.success_text')).toBeInTheDocument()
    })

    view1.unmount()
    cleanup()

    // Operation 2: Move bond B to Jar 1 using the same QueryClient
    const onOpenChange2 = vi.fn()
    render(
      <QueryClientProvider client={queryClient}>
        <MoveToJarDialog open onOpenChange={onOpenChange2} walletFileName="test.jmdat" utxo={bondB} />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByText('Jar 1'))
    fireEvent.click(screen.getByText('global.next'))

    await waitFor(() => {
      expect(screen.getByText(h.addressResponses[1])).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('earn.fidelity_bond.move.text_button_submit'))

    await waitFor(() => {
      expect(screen.getByText('earn.fidelity_bond.move.success_text')).toBeInTheDocument()
    })

    // Assertions
    expect(h.getAddressCalls).toHaveLength(2)
    expect(h.directSendCalls).toHaveLength(2)

    const firstDestination = h.directSendCalls[0].body?.destination
    const secondDestination = h.directSendCalls[1].body?.destination
    expect(firstDestination).toBe(h.addressResponses[0])
    expect(secondDestination).toBe(h.addressResponses[1])
    expect(firstDestination).not.toBe(secondDestination)

    expect(h.directSendCalls[0].body?.input_utxos).toEqual([bondA.utxo])
    expect(h.directSendCalls[1].body?.input_utxos).toEqual([bondB.utxo])
  })

  it('cancelling and reopening starts a new operation with a fresh address', async () => {
    let isOpen = true
    const onOpenChange = vi.fn((open: boolean) => {
      isOpen = open
    })

    const view = render(
      <QueryClientProvider client={queryClient}>
        <MoveToJarDialog open={isOpen} onOpenChange={onOpenChange} walletFileName="test.jmdat" utxo={bondA} />
      </QueryClientProvider>,
    )

    // Select Jar 1 and fetch address
    fireEvent.click(screen.getByText('Jar 1'))
    fireEvent.click(screen.getByText('global.next'))

    await waitFor(() => {
      expect(screen.getByText(h.addressResponses[0])).toBeInTheDocument()
    })
    expect(h.getAddressCalls).toHaveLength(1)

    // Cancel the dialog
    fireEvent.click(screen.getByText('global.cancel'))
    expect(onOpenChange).toHaveBeenCalledWith(false)

    // Reopen the dialog on the same mounted instance
    isOpen = true
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <MoveToJarDialog open={isOpen} onOpenChange={onOpenChange} walletFileName="test.jmdat" utxo={bondA} />
      </QueryClientProvider>,
    )

    // Select Jar 1 again
    fireEvent.click(screen.getByText('Jar 1'))
    fireEvent.click(screen.getByText('global.next'))

    // A fresh address must be requested and rendered
    await waitFor(() => {
      expect(screen.getByText(h.addressResponses[1])).toBeInTheDocument()
    })
    expect(h.getAddressCalls).toHaveLength(2)
  })

  it('rerendering during review preserves the displayed address and does not allocate another', async () => {
    const view = render(
      <QueryClientProvider client={queryClient}>
        <MoveToJarDialog open onOpenChange={vi.fn()} walletFileName="test.jmdat" utxo={bondA} />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByText('Jar 1'))
    fireEvent.click(screen.getByText('global.next'))

    await waitFor(() => {
      expect(screen.getByText(h.addressResponses[0])).toBeInTheDocument()
    })
    expect(h.getAddressCalls).toHaveLength(1)

    // Trigger ordinary rerender
    view.rerender(
      <QueryClientProvider client={queryClient}>
        <MoveToJarDialog open onOpenChange={vi.fn()} walletFileName="test.jmdat" utxo={bondA} />
      </QueryClientProvider>,
    )

    // Address remains identical and no extra address request is made
    expect(screen.getByText(h.addressResponses[0])).toBeInTheDocument()
    expect(h.getAddressCalls).toHaveLength(1)
  })

  it('changing destination jars uses the corresponding address', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MoveToJarDialog open onOpenChange={vi.fn()} walletFileName="test.jmdat" utxo={bondA} />
      </QueryClientProvider>,
    )

    // Select Jar 1
    fireEvent.click(screen.getByText('Jar 1'))
    fireEvent.click(screen.getByText('global.next'))

    await waitFor(() => {
      expect(screen.getByText(h.addressResponses[0])).toBeInTheDocument()
    })
    expect(h.getAddressCalls[0].path?.mixdepth).toBe('1')

    // Navigate back and switch to Jar 2
    fireEvent.click(screen.getByText('global.back'))
    fireEvent.click(screen.getByText('Jar 2'))
    fireEvent.click(screen.getByText('global.next'))

    await waitFor(() => {
      expect(screen.getByText(h.addressResponses[1])).toBeInTheDocument()
    })
    expect(h.getAddressCalls).toHaveLength(2)
    expect(h.getAddressCalls[1].path?.mixdepth).toBe('2')

    // Submit and assert that destination address matches Jar 2's address
    fireEvent.click(screen.getByText('earn.fidelity_bond.move.text_button_submit'))
    await waitFor(() => {
      expect(screen.getByText('earn.fidelity_bond.move.success_text')).toBeInTheDocument()
    })

    expect(h.directSendCalls[0].body?.destination).toBe(h.addressResponses[1])
  })

  it('address loading or failure prevents confirmation until a valid address is available', async () => {
    // 1. Failure scenario
    h.addressFailure = new Error('network failure')

    render(
      <QueryClientProvider client={queryClient}>
        <MoveToJarDialog open onOpenChange={vi.fn()} walletFileName="test.jmdat" utxo={bondA} />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByText('Jar 1'))
    fireEvent.click(screen.getByText('global.next'))

    // Error alert is shown
    await waitFor(() => {
      expect(screen.getByText('global.errors.error_loading_address_failed')).toBeInTheDocument()
    })

    // Submit button is disabled
    const submitButton = screen.getByText('earn.fidelity_bond.move.text_button_submit').closest('button')
    expect(submitButton).toBeDisabled()

    // Clicking does not send
    fireEvent.click(submitButton!)
    expect(h.directSendCalls).toHaveLength(0)
  })
})
