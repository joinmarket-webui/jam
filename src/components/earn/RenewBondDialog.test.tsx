import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { FidelityBondUtxo } from '@/hooks/useQueryUtxos'
import { RenewBondDialog } from './RenewBondDialog'

type ChildrenProps = { children?: ReactNode }
type ValueProps = { value: string }

const h = vi.hoisted(() => ({
  queryReturn: { data: { address: 'bc1timelock' }, isLoading: false, isError: false },
  mutateAsync: vi.fn<() => Promise<unknown>>().mockResolvedValue({ txinfo: { txid: 'abcd1234' } }),
  isPending: false,
  refetch: vi.fn(),
  utxoFrozen: false,
  extraUtxos: [] as Array<{ utxo: string; value: number; frozen: boolean }>,
  selectHandlers: [] as Array<(value: string) => void>,
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

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  directsendMutation: vi.fn(() => ({})),
  freezeMutation: vi.fn(() => ({})),
  gettimelockaddressOptions: vi.fn(() => ({ queryKey: ['mock'], queryFn: vi.fn() })),
}))

vi.mock('@/hooks/useApiClient', () => ({ useApiClient: () => ({}) }))

vi.mock('@/store/jamSettingsStore', () => ({ useDeveloperMode: () => ({ enabled: false }) }))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useJamWalletInfoContext: () => ({
    jars: [
      {
        jarIndex: 0,
        name: 'Jar 0',
        color: '#000',
        balanceSummary: { calculatedAvailableBalanceInSats: 5000 },
        utxos: [{ utxo: 'tx1:0', value: 1000, frozen: h.utxoFrozen }, ...h.extraUtxos],
      },
    ],
    refetch: h.refetch,
  }),
}))

vi.mock('@/lib/errorReason', () => ({ getErrorReason: () => 'reason' }))

vi.mock('@/lib/fidelityBondUtils', () => ({
  lockdate: { toTimestamp: () => 1_893_456_000_000 },
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  formatSats: (sats: number) => `${sats} sats`,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('./CreateFidelityBondDialog/types', () => ({
  generateLockdateOptions: () => [
    { value: '2026-07', label: 'Jul 2026' },
    { value: '2027-06', label: 'Jun 2027' },
  ],
  getYearOptions: () => [
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
  ],
  getMonthOptions: () => [
    { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' },
  ],
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: ChildrenProps & { open?: boolean; onOpenChange?: (o: boolean) => void }) =>
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

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: ChildrenProps & { onValueChange?: (v: string) => void }) => {
    if (onValueChange) h.selectHandlers.push(onValueChange)
    return <div>{children}</div>
  },
  SelectContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectItem: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectTrigger: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectValue: () => <div />,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: ChildrenProps & { onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/switch', () => ({
  Switch: ({ onCheckedChange }: { onCheckedChange?: (checked: boolean) => void }) => (
    <button data-testid="confirm-switch" onClick={() => onCheckedChange?.(true)} />
  ),
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: ChildrenProps) => <div>{children}</div>,
  AlertDescription: ({ children }: ChildrenProps) => <div>{children}</div>,
  AlertTitle: ({ children }: ChildrenProps) => <div>{children}</div>,
}))

vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }))

vi.mock('@/components/ui/jam/CopyButton', () => ({
  CopyButton: ({ value }: ValueProps) => <div data-testid="copy">{value}</div>,
}))

vi.mock('@/components/ui/label', () => ({ Label: ({ children }: ChildrenProps) => <label>{children}</label> }))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: ValueProps) => <div data-testid="address">{value}</div>,
}))

const utxo = {
  utxo: 'tx1:0',
  value: 1000,
  mixdepth: 0,
  confirmations: 10,
  address: 'bc1',
  frozen: false,
} as unknown as FidelityBondUtxo

const renderDialog = () =>
  render(<RenewBondDialog open onOpenChange={vi.fn()} walletFileName={'test.jmdat'} utxo={utxo} />)

const selectMonth = (value: string) => {
  const handler = h.selectHandlers.at(-2)
  act(() => handler?.(value))
}

const selectYear = (value: string) => {
  const handler = h.selectHandlers.at(-1)
  act(() => handler?.(value))
}

const goToConfirm = () => {
  selectMonth('06')
  fireEvent.click(screen.getByText('earn.fidelity_bond.select_date.text_primary_button'))
}

describe('RenewBondDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.queryReturn = { data: { address: 'bc1timelock' }, isLoading: false, isError: false }
    h.mutateAsync = vi.fn<() => Promise<unknown>>().mockResolvedValue({ txinfo: { txid: 'abcd1234' } })
    h.isPending = false
    h.utxoFrozen = false
    h.extraUtxos = []
    h.selectHandlers = []
  })

  it('renders the date selection step', () => {
    renderDialog()
    expect(screen.getByText('earn.fidelity_bond.renew.title')).toBeInTheDocument()
    expect(screen.getByText('earn.fidelity_bond.select_date.description')).toBeInTheDocument()
  })

  it('selecting a month enables the next button and shows the chosen date', () => {
    renderDialog()
    selectMonth('06')
    expect(screen.getByText('earn.fidelity_bond.review_inputs.label_lock_date')).toBeInTheDocument()
  })

  it('selecting a year computes a clamped lock date', () => {
    renderDialog()
    selectYear('2027')
    expect(screen.getByText('earn.fidelity_bond.review_inputs.label_lock_date')).toBeInTheDocument()
  })

  it('selecting an early month bumps the year forward', () => {
    renderDialog()
    // a month earlier than the minimum month forces year = minYear + 1
    selectMonth('06')
    selectYear('2026')
    expect(screen.getByText('earn.fidelity_bond.review_inputs.label_lock_date')).toBeInTheDocument()
  })

  it('moves to the confirm step and shows the timelock address', () => {
    renderDialog()
    goToConfirm()
    expect(screen.getByTestId('address')).toHaveTextContent('bc1timelock')
  })

  it('shows a loading spinner while the timelock address loads', () => {
    h.queryReturn = { data: undefined, isLoading: true, isError: false }
    renderDialog()
    goToConfirm()
    expect(screen.getByText('earn.fidelity_bond.renew.text_loading')).toBeInTheDocument()
  })

  it('shows an error alert when the address query fails', () => {
    h.queryReturn = { data: undefined, isLoading: false, isError: true }
    renderDialog()
    expect(screen.getByText('earn.fidelity_bond.error_loading_address')).toBeInTheDocument()
  })

  it('completes the renew flow and reaches the success step', async () => {
    h.extraUtxos = [{ utxo: 'tx2:0', value: 500, frozen: false }]
    renderDialog()
    goToConfirm()
    fireEvent.click(screen.getByTestId('confirm-switch'))
    fireEvent.click(screen.getByText('earn.fidelity_bond.renew.text_button_submit'))

    await waitFor(() => expect(screen.getByText('earn.fidelity_bond.renew.success_text')).toBeInTheDocument())
    expect(screen.getAllByText('abcd1234').length).toBeGreaterThan(0)
    expect(h.refetch).toHaveBeenCalled()
  })

  it('unfreezes a frozen fidelity bond before sending', async () => {
    const frozenUtxo = { ...utxo, frozen: true } as unknown as FidelityBondUtxo
    render(<RenewBondDialog open onOpenChange={vi.fn()} walletFileName={'test.jmdat'} utxo={frozenUtxo} />)
    goToConfirm()
    fireEvent.click(screen.getByTestId('confirm-switch'))
    fireEvent.click(screen.getByText('earn.fidelity_bond.renew.text_button_submit'))

    await waitFor(() => expect(screen.getByText('earn.fidelity_bond.renew.success_text')).toBeInTheDocument())
    const calls = h.mutateAsync.mock.calls as Array<[{ body?: { freeze?: boolean } }]>
    expect(calls.some((call) => call[0]?.body?.freeze === false)).toBe(true)
  })

  it('returns to the confirm step when sending fails', async () => {
    h.extraUtxos = [{ utxo: 'tx2:0', value: 500, frozen: false }]
    h.mutateAsync = vi.fn<() => Promise<unknown>>().mockRejectedValue(new Error('send failed'))
    renderDialog()
    goToConfirm()
    fireEvent.click(screen.getByTestId('confirm-switch'))
    fireEvent.click(screen.getByText('earn.fidelity_bond.renew.text_button_submit'))

    await waitFor(() =>
      expect(screen.getByText('earn.fidelity_bond.renew.confirm_send_modal.title')).toBeInTheDocument(),
    )
  })

  it('closes and resets when the dialog is dismissed', () => {
    const onOpenChange = vi.fn()
    render(<RenewBondDialog open onOpenChange={onOpenChange} walletFileName={'test.jmdat'} utxo={utxo} />)
    fireEvent.click(screen.getByText('close-dialog'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('navigates back from confirm to date selection', () => {
    renderDialog()
    goToConfirm()
    fireEvent.click(screen.getByText('global.back'))
    expect(screen.getByText('earn.fidelity_bond.select_date.description')).toBeInTheDocument()
  })
})
