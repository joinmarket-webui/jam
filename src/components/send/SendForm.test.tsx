import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import type { BalanceSummary } from '@/lib/balanceSummary'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { flushActUpdates } from '@/test/flushActUpdates'
import { SendForm } from './SendForm'

const h = vi.hoisted(() => ({
  getaddressResult: {
    data: { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
    error: undefined as { message: string } | undefined,
  },
  toastSuccess: vi.fn<(message: string) => void>(),
  toastError: vi.fn<(message: string) => void>(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => {
      h.toastSuccess(message)
    },
    error: (message: string) => {
      h.toastError(message)
    },
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.mock('@/context/JamWalletInfoContext', () => ({
  useDetectNetwork: () => ({ network: 'mainnet' }),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  delayedPromise: () => Promise.resolve(),
}))

vi.mock('../ui/jam/Address', () => ({
  Address: () => <div data-testid="address" />,
}))

vi.mock('../ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString?: string }) => <div data-testid="balance">{valueString}</div>,
}))

vi.mock('../ui/jam/SelectableJar', () => ({
  SelectableJar: ({ name, onClick, disabled }: { name?: string; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {name}
    </button>
  ),
}))

vi.mock('@/components/send/SendCoinjoinPreconditionAlert', () => ({
  SendCoinjoinPreconditionAlert: () => <div data-testid="precondition-alert" />,
}))

vi.mock('./TxFeeForm', () => ({
  TxFeeForm: () => <div data-testid="tx-fee-form" />,
}))

vi.mock('@/components/ui/QrScannerDialog', () => ({
  default: ({
    open,
    onScan,
  }: {
    open?: boolean
    onScan?: (r: { address: string; amount?: number; message?: string }) => void
  }) =>
    open ? (
      <button data-testid="qr-scan" onClick={() => onScan?.({ address: 'bc1qscan', amount: 0.001, message: 'note' })}>
        scan
      </button>
    ) : null,
}))

vi.mock('./JarSelectorDialog', () => ({
  default: ({ open, onConfirm }: { open?: boolean; onConfirm?: (jarIndex: number) => void }) =>
    open ? (
      <button data-testid="jar-confirm" onClick={() => void onConfirm?.(1)}>
        confirm-jar
      </button>
    ) : null,
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/jm', () => ({
  getaddress: () => Promise.resolve(h.getaddressResult),
}))

describe('SendForm', () => {
  const mockJars = [
    {
      jarIndex: 0,
      name: 'Jar 0',
      color: '#000',
      balanceSummary: {
        calculatedAvailableBalanceInSats: 5000,
        calculatedTotalBalanceInSats: 5000,
        calculatedFrozenOrLockedBalanceInSats: 0,
      },
      utxos: [],
    },
    {
      jarIndex: 1,
      name: 'Jar 1',
      color: '#111',
      balanceSummary: {
        calculatedAvailableBalanceInSats: 0,
        calculatedTotalBalanceInSats: 0,
        calculatedFrozenOrLockedBalanceInSats: 0,
      },
      utxos: [],
    },
  ] as unknown as Jar[]

  const mockAddressSummary: AddressSummary = {}
  const mockBalanceSummary = { calculatedTotalBalanceInSats: 5000 } as unknown as BalanceSummary
  const mockFeeConfigValues = {
    txFeeFactor: 0.1,
    maxCjAbsoluteFee: 100,
    txFee: { txFeeUnit: 'blocks', txFeeInBlocks: 3, txFeeInSatsPerVbyte: undefined },
  } as unknown as JamFeeConfigValues

  const renderForm = (extra?: { disabled?: boolean; debug?: boolean }) =>
    render(
      <SendForm
        onSubmit={vi.fn()}
        walletFileName="test.jmdat"
        jars={mockJars}
        walletBalanceSummary={mockBalanceSummary}
        addressSummary={mockAddressSummary}
        feeConfigValues={mockFeeConfigValues}
        disabled={extra?.disabled}
        debug={extra?.debug}
      />,
    )

  beforeEach(() => {
    vi.clearAllMocks()
    h.getaddressResult = { data: { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }, error: undefined }
    h.toastSuccess = vi.fn<(message: string) => void>()
    h.toastError = vi.fn<(message: string) => void>()
  })

  it('renders the core fields', () => {
    renderForm()
    expect(screen.getByText('send.label_source_jar')).toBeInTheDocument()
    expect(screen.getByText('send.label_recipient')).toBeInTheDocument()
    expect(screen.getByText('send.label_amount_input')).toBeInTheDocument()
  })

  it('selects a source jar', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Jar 0' }))
    expect(screen.getByRole('button', { name: 'Jar 0' })).toBeInTheDocument()
    await flushActUpdates()
  })

  it('enables sweep, then clears it, then reselecting the jar resets sweep', async () => {
    renderForm()
    fireEvent.click(screen.getByRole('button', { name: 'Jar 0' }))

    fireEvent.click(document.querySelector('#btn-sweep-trigger')!)
    expect(document.querySelector('#btn-sweep-clear-trigger')).toBeInTheDocument()
    expect(
      document.querySelector('#send-amount-sweep-from-jar')?.closest('[data-slot="button-group"]'),
    ).toBeInTheDocument()

    // reselect the same jar while sweep is active -> hits the sweep-reset branch
    fireEvent.click(screen.getByRole('button', { name: 'Jar 0' }))

    fireEvent.click(document.querySelector('#btn-sweep-trigger')!)
    fireEvent.click(document.querySelector('#btn-sweep-clear-trigger')!)
    await flushActUpdates()
  })

  it('applies a scanned bip21 result', async () => {
    renderForm()
    fireEvent.click(document.querySelector('#show-qr-scanner-trigger')!)
    fireEvent.click(await screen.findByTestId('qr-scan'))
    expect(screen.getByText('note')).toBeInTheDocument()
    await flushActUpdates()
  })

  it('selects a destination address from the jar selector', async () => {
    renderForm()
    fireEvent.click(document.querySelector('#show-address-from-jar-selector-trigger')!)
    fireEvent.click(await screen.findByTestId('jar-confirm'))
    await waitFor(() => expect(screen.getByTestId('address')).toBeInTheDocument())
    expect(
      document.querySelector('#send-destination-address-from-jar')?.closest('[data-slot="button-group"]'),
    ).toBeInTheDocument()
  })

  it('shows an error when the jar selector address lookup fails', async () => {
    h.getaddressResult = {
      data: { address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' },
      error: { message: 'boom' },
    }
    renderForm()
    fireEvent.click(document.querySelector('#show-address-from-jar-selector-trigger')!)
    fireEvent.click(await screen.findByTestId('jar-confirm'))
    await waitFor(() => expect(h.toastError).toHaveBeenCalledWith('global.errors.error_loading_address_failed'))
  })

  it('applies a pasted bip21 uri', async () => {
    renderForm()
    const input = document.querySelector('#send-destination') as HTMLInputElement
    fireEvent.paste(input, {
      clipboardData: { getData: () => 'bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq?amount=0.5' },
    })
    expect(h.toastSuccess).toHaveBeenCalledWith('send.qr_scan_bip21_applied')
    await flushActUpdates()
  })

  it('ignores a non-bitcoin paste', () => {
    renderForm()
    const input = document.querySelector('#send-destination') as HTMLInputElement
    fireEvent.paste(input, { clipboardData: { getData: () => 'just some text' } })
    expect(h.toastSuccess).not.toHaveBeenCalled()
  })

  it('renders the debug panel when debug is enabled', () => {
    renderForm({ debug: true })
    expect(screen.getByText('isValid:')).toBeInTheDocument()
  })

  it('renders disabled state', () => {
    renderForm({ disabled: true })
    const submit = document.querySelector('button[type="submit"]')
    expect(submit).toBeDisabled()
  })

  it('submits the form', async () => {
    const onSubmit = vi.fn()
    render(
      <SendForm
        onSubmit={onSubmit}
        walletFileName="test.jmdat"
        jars={mockJars}
        walletBalanceSummary={mockBalanceSummary}
        addressSummary={mockAddressSummary}
        feeConfigValues={mockFeeConfigValues}
      />,
    )
    fireEvent.submit(document.querySelector('form')!)
    await flushActUpdates()
  })

  it('shows a network badge for a non-mainnet destination address', async () => {
    renderForm()
    const input = document.querySelector('#send-destination') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx' } })
    expect(screen.getByText('testnet')).toBeInTheDocument()
    await flushActUpdates()
  })
})
