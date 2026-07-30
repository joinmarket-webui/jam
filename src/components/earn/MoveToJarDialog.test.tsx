import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { MoveToJarDialog } from './MoveToJarDialog'

type ChildrenProps = { children: ReactNode }
type DialogProps = ChildrenProps & { open?: boolean; onOpenChange?: (open: boolean) => void }
type ValueProps = { value: string }

const h = vi.hoisted(() => ({
  queryReturn: {
    data: undefined as { address?: string } | undefined,
    isLoading: false,
    isError: false,
  },
  mutateAsync: vi.fn<() => Promise<unknown>>().mockResolvedValue({ txinfo: { txid: 'movetxid99' } }),
  isPending: false,
  refetch: vi.fn(),
  extraUtxos: [] as Array<{ utxo: string; value: number; frozen: boolean }>,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => h.queryReturn,
  useMutation: () => ({ mutateAsync: h.mutateAsync, isPending: h.isPending }),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  directsendMutation: vi.fn(() => ({})),
  freezeMutation: vi.fn(() => ({})),
  getaddressOptions: vi.fn(() => ({ queryKey: ['mock'], queryFn: vi.fn() })),
}))

vi.mock('@/hooks/useApiClient', () => ({ useApiClient: () => ({}) }))

vi.mock('@/lib/errorReason', () => ({ getErrorReason: () => 'reason' }))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  formatSats: (sats: number) => `${sats} sats`,
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    jars: [
      {
        jarIndex: 0,
        name: 'Jar 0',
        color: '#000',
        balanceSummary: { calculatedAvailableBalanceInSats: 5000 },
        utxos: [{ utxo: 'tx1:0', value: 1000, frozen: false }, ...h.extraUtxos],
      },
      {
        jarIndex: 1,
        name: 'Jar 1',
        color: '#111',
        balanceSummary: { calculatedAvailableBalanceInSats: 1000 },
        utxos: [],
      },
    ],
    walletBalanceSummary: { calculatedTotalBalanceInSats: 6000 },
    refetch: h.refetch,
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
  Dialog: ({ children, open, onOpenChange }: DialogProps) =>
    open ? (
      <div data-testid="dialog">
        <button onClick={() => onOpenChange?.(false)}>close-dialog</button>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogHeader: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  DialogFooter: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ onCheckedChange }: { onCheckedChange?: (checked: boolean) => void }) => (
    <button data-testid="confirm-switch" onClick={() => onCheckedChange?.(true)} />
  ),
}))

vi.mock('@/components/ui/jam/Address', () => ({
  Address: ({ value }: ValueProps) => <div data-testid="address">{value}</div>,
}))

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString} sats</span>,
}))

vi.mock('@/components/ui/jam/CopyButton', () => ({
  CopyButton: ({ value }: ValueProps) => <div data-testid="copy">{value}</div>,
}))

const utxo = {
  utxo: 'tx1:0',
  value: 1000,
  mixdepth: 0,
  confirmations: 10,
  address: 'bc1',
  frozen: false,
} as unknown as FidelityBondUtxo

const renderDialog = (props?: { utxo?: FidelityBondUtxo; onOpenChange?: (open: boolean) => void }) =>
  render(
    <MoveToJarDialog
      open
      onOpenChange={props?.onOpenChange ?? vi.fn()}
      walletFileName="test.jmdat"
      utxo={props?.utxo ?? utxo}
    />,
  )

const goToConfirm = () => {
  fireEvent.click(screen.getByText('Jar 1'))
  fireEvent.click(screen.getByText('global.next'))
}

describe('MoveToJarDialog', () => {
  beforeEach(() => {
    h.queryReturn = { data: { address: 'bc111' }, isLoading: false, isError: false }
    h.mutateAsync = vi.fn<() => Promise<unknown>>().mockResolvedValue({ txinfo: { txid: 'movetxid99' } })
    h.isPending = false
    h.refetch = vi.fn()
    h.extraUtxos = []
  })

  it('renders the jar selection step', () => {
    renderDialog()
    expect(screen.getByText('earn.fidelity_bond.move.title')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.move.select_jar.description')).toBeInTheDocument()
    expect(screen.getByText('Jar 0')).toBeEnabled()
    expect(screen.getByText('Jar 1')).toBeInTheDocument()
  })

  it('moves to the confirm step and shows the destination address', () => {
    renderDialog()
    goToConfirm()
    expect(screen.getByText('Jar 1')).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent('bc111')
  })

  it('shows a loading indicator while the destination address loads', () => {
    h.queryReturn = { data: undefined, isLoading: true, isError: false }
    renderDialog()
    goToConfirm()
    expect(screen.getByText('earn.fidelity_bond.move.text_loading')).toBeInTheDocument()
  })

  it('shows an error alert when the address query fails', () => {
    h.queryReturn = { data: undefined, isLoading: false, isError: true }
    renderDialog()
    goToConfirm()
    expect(screen.getByText('global.errors.error_loading_address_failed')).toBeInTheDocument()
  })

  it('completes the move flow and reaches the success step', async () => {
    h.extraUtxos = [{ utxo: 'tx2:0', value: 500, frozen: false }]
    renderDialog()
    goToConfirm()
    fireEvent.click(screen.getByText('earn.fidelity_bond.move.text_button_submit'))

    await waitFor(() => expect(screen.getByText('earn.fidelity_bond.move.success_text')).toBeInTheDocument())
    expect(screen.getAllByText('movetxid99').length).toBeGreaterThan(0)
    expect(h.refetch).toHaveBeenCalled()
  })

  it('unfreezes a frozen fidelity bond before sending', async () => {
    const frozenUtxo = { ...utxo, frozen: true } as unknown as FidelityBondUtxo
    renderDialog({ utxo: frozenUtxo })
    goToConfirm()
    fireEvent.click(screen.getByText('earn.fidelity_bond.move.text_button_submit'))

    await waitFor(() => expect(screen.getByText('earn.fidelity_bond.move.success_text')).toBeInTheDocument())
    const calls = h.mutateAsync.mock.calls as unknown as Array<[{ body?: { freeze?: boolean } }]>
    expect(calls.some((call) => call[0]?.body?.freeze === false)).toBe(true)
  })

  it('returns to the confirm step when sending fails', async () => {
    h.mutateAsync = vi.fn<() => Promise<unknown>>().mockRejectedValue(new Error('send failed'))
    renderDialog()
    goToConfirm()
    fireEvent.click(screen.getByText('earn.fidelity_bond.move.text_button_submit'))

    await waitFor(() =>
      expect(screen.getByText('earn.fidelity_bond.move.confirm_send_modal.title')).toBeInTheDocument(),
    )
  })

  it('navigates back from confirm to jar selection', () => {
    renderDialog()
    goToConfirm()
    fireEvent.click(screen.getByText('global.back'))
    expect(screen.getByText('earn.fidelity_bond.move.select_jar.description')).toBeInTheDocument()
  })

  it('closes and resets when the dialog is dismissed', () => {
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })
    fireEvent.click(screen.getByText('close-dialog'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
