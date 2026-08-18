import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import type { BalanceSummary } from '@/lib/balanceSummary'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { flushActUpdates } from '@/test/flushActUpdates'
import { SendForm } from './SendForm'

const h = vi.hoisted(() => {
  const DEFAULT_NEW_DUMMY_ADDRESS_0 = 'bcrt1q6rz28mcfaxtmd6v789l9rrlrusdprr9pz3cppk'
  const DEFAULT_SCAN_DUMMY_ADDRESS_1 = 'bcrt1qt5yxk3xzrx66q9wd5sdyynklqynqcyf7uh74j3'
  return {
    DEFAULT_NEW_DUMMY_ADDRESS_0,
    DEFAULT_SCAN_DUMMY_ADDRESS_1,
    getaddressResult: {
      data: { address: DEFAULT_NEW_DUMMY_ADDRESS_0 },
      error: undefined as { message: string } | undefined,
    },
    toastSuccess: vi.fn<(message: string) => void>(),
    toastError: vi.fn<(message: string) => void>(),
    hasOrders: true,
    orderbookIsLoading: false,
    orderbookError: false,
  }
})

vi.mock('@/hooks/useQueryOrderbook', () => ({
  useQueryOrderbook: () => ({
    hasOrders: h.hasOrders,
    queryResult: {
      isLoading: h.orderbookIsLoading,
      isError: h.orderbookError,
    },
  }),
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
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => key + (options ? ' ' + JSON.stringify(options) : ''),
  }),
}))

vi.stubGlobal(
  'ResizeObserver',
  class ResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  },
)

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

vi.mock('@/components/ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString?: string }) => <div data-testid="balance">{valueString}</div>,
}))

vi.mock('../ui/jam/SelectableJar', () => ({
  SelectableJar: ({ name, onSelect, disabled }: { name?: string; onSelect?: () => void; disabled?: boolean }) => (
    <button onClick={onSelect} disabled={disabled}>
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

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/jm', () => ({
  getaddress: () => Promise.resolve(h.getaddressResult),
}))

describe('SendForm', () => {
  const mockJars = [
    {
      jarIndex: 0,
      name: 'Jar 0',
      color: '#000',
      balanceSummary: {
        calculatedAvailableBalanceInSats: 4900,
        calculatedTotalBalanceInSats: 5000,
        calculatedFrozenOrLockedBalanceInSats: 100,
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
    h.getaddressResult = { data: { address: h.DEFAULT_NEW_DUMMY_ADDRESS_0 }, error: undefined }
    h.toastSuccess = vi.fn<(message: string) => void>()
    h.toastError = vi.fn<(message: string) => void>()
    h.hasOrders = true
    h.orderbookIsLoading = false
    h.orderbookError = false
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

    expect(document.querySelector('#send-amount-sweep-from-jar')?.parentElement).toHaveClass('hidden')
    expect(screen.queryByTestId('balance')).not.toBeInTheDocument()

    const sweepButtonBefore = document.querySelector('#btn-sweep-trigger')
    expect(sweepButtonBefore).not.toBeEnabled()
    expect(sweepButtonBefore?.parentElement).not.toHaveClass('hidden')

    const sweepClearButtonBefore = document.querySelector('#btn-sweep-clear-trigger')
    expect(sweepClearButtonBefore).not.toBeEnabled()
    expect(sweepClearButtonBefore?.parentElement).toHaveClass('hidden')

    fireEvent.click(screen.getByRole('button', { name: 'Jar 0' }))

    const sweepButtonAfterJarSelect = document.querySelector('#btn-sweep-trigger')
    expect(sweepButtonAfterJarSelect).toBeEnabled()
    expect(sweepButtonAfterJarSelect?.parentElement).not.toHaveClass('hidden')

    const sweepClearButtonAfterJarSelect = document.querySelector('#btn-sweep-clear-trigger')
    expect(sweepClearButtonAfterJarSelect).not.toBeEnabled()

    fireEvent.click(document.querySelector('#btn-sweep-trigger')!)

    expect(document.querySelector('#send-amount-sweep-from-jar')?.parentElement).not.toHaveClass('hidden')
    expect(await screen.findByTestId('balance')).toBeInTheDocument()
    expect(await screen.findByTestId('balance')).toHaveTextContent(
      '' + mockJars[0].balanceSummary.calculatedAvailableBalanceInSats,
    )

    const sweepButtonAfterTrigger = document.querySelector('#btn-sweep-trigger')
    expect(sweepButtonAfterTrigger).not.toBeEnabled()
    expect(sweepButtonAfterTrigger?.parentElement).toHaveClass('hidden')

    const sweepClearButtonAfterSweepTrigger = document.querySelector('#btn-sweep-clear-trigger')
    expect(sweepClearButtonAfterSweepTrigger).toBeEnabled()
    expect(sweepClearButtonAfterSweepTrigger?.parentElement).not.toHaveClass('hidden')

    // reselect the same jar while sweep is active -> hits the sweep-reset branch
    fireEvent.click(screen.getByRole('button', { name: 'Jar 0' }))

    fireEvent.click(document.querySelector('#btn-sweep-trigger')!)

    expect(document.querySelector('#btn-sweep-trigger')).not.toBeEnabled()
    expect(document.querySelector('#btn-sweep-clear-trigger')).toBeEnabled()
    expect(screen.queryByTestId('balance')).toBeInTheDocument()

    fireEvent.click(document.querySelector('#btn-sweep-clear-trigger')!)

    expect(document.querySelector('#btn-sweep-trigger')).toBeEnabled()
    expect(document.querySelector('#btn-sweep-clear-trigger')).not.toBeEnabled()
    expect(screen.queryByTestId('balance')).not.toBeInTheDocument()

    await flushActUpdates()
  })

  it('applies a scanned bip21 result', async () => {
    renderForm()

    const inputBefore = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputBefore).toHaveValue('')

    fireEvent.click(document.querySelector('#show-qr-scanner-trigger')!)
    fireEvent.click(await screen.findByTestId('qr-scan'))

    const inputAfter = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputAfter).toHaveValue('bc1qscan')

    await flushActUpdates()
  })

  it('selects a destination address from the jar selector', async () => {
    renderForm()

    const inputBefore = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputBefore).toHaveValue('')

    fireEvent.click(document.querySelector('#show-address-from-jar-selector-trigger')!)
    fireEvent.click(await screen.findByTestId('jar-confirm'))

    await waitFor(() => expect(screen.getByTestId('address')).toBeInTheDocument())

    const inputAfter = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputAfter).toHaveValue(h.DEFAULT_NEW_DUMMY_ADDRESS_0)

    expect(
      document.querySelector('#send-destination-address-from-jar')?.closest('[data-slot="button-group"]'),
    ).toBeInTheDocument()
  })

  it('shows an error when the jar selector address lookup fails', async () => {
    h.getaddressResult = {
      data: { address: h.DEFAULT_NEW_DUMMY_ADDRESS_0 },
      error: { message: 'boom' },
    }
    renderForm()

    const inputBefore = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputBefore).toHaveValue('')

    fireEvent.click(document.querySelector('#show-address-from-jar-selector-trigger')!)

    fireEvent.click(await screen.findByTestId('jar-confirm'))

    const inputAfter = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputAfter).toHaveValue('')

    await waitFor(() => expect(h.toastError).toHaveBeenCalledWith('global.errors.error_loading_address_failed'))
  })

  it('applies a pasted bip21 uri and shows success toast', async () => {
    renderForm()

    const inputBefore = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputBefore).toHaveValue('')

    fireEvent.paste(inputBefore, {
      clipboardData: { getData: () => `bitcoin:${h.DEFAULT_SCAN_DUMMY_ADDRESS_1}?amount=0.5` },
    })

    const inputAfter = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputAfter).toHaveValue(h.DEFAULT_SCAN_DUMMY_ADDRESS_1)

    expect(h.toastSuccess).toHaveBeenCalledWith('send.qr_scan_bip21_applied')
    await flushActUpdates()
  })

  it('ignores a non-bitcoin-uri paste', () => {
    renderForm()
    const input = document.querySelector('#send-destination') as HTMLInputElement

    fireEvent.paste(input, { clipboardData: { getData: () => 'just some text' } })

    expect(h.toastSuccess).not.toHaveBeenCalled()
  })

  it('applies pasted address and does show success toast', () => {
    renderForm()
    const inputBefore = document.querySelector('#send-destination') as HTMLInputElement

    fireEvent.paste(inputBefore, { clipboardData: { getData: () => h.DEFAULT_SCAN_DUMMY_ADDRESS_1 } })

    const inputAfter = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputAfter).toHaveValue(h.DEFAULT_SCAN_DUMMY_ADDRESS_1)

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

    const inputBefore = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputBefore).toHaveValue('')

    fireEvent.change(inputBefore, { target: { value: 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx' } })

    const inputAfter = document.querySelector('#send-destination') as HTMLInputElement
    expect(inputAfter).toHaveValue('tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx')

    expect(screen.getByText('testnet')).toBeInTheDocument()

    await flushActUpdates()
  })

  it('shows empty orderbook warning when collaborative send is selected and orderbook is empty', () => {
    h.hasOrders = false
    renderForm()

    expect(screen.getByText('orderbook.alert_precheck_empty_title')).toBeInTheDocument()
  })

  it('does not show empty orderbook warning when orderbook is loading or has error', () => {
    h.hasOrders = false
    h.orderbookIsLoading = true

    const { rerender } = renderForm()
    expect(screen.queryByText('orderbook.alert_precheck_empty_title')).not.toBeInTheDocument()

    h.orderbookIsLoading = false
    h.orderbookError = true
    rerender(
      <SendForm
        onSubmit={vi.fn()}
        walletFileName="test.jmdat"
        jars={mockJars}
        walletBalanceSummary={mockBalanceSummary}
        addressSummary={mockAddressSummary}
        feeConfigValues={mockFeeConfigValues}
      />,
    )
    expect(screen.queryByText('orderbook.alert_precheck_empty_title')).not.toBeInTheDocument()
  })

  it('does not show empty orderbook warning when non-collaborative send is selected', async () => {
    h.hasOrders = false
    renderForm()

    expect(screen.getByText('orderbook.alert_precheck_empty_title')).toBeInTheDocument()

    const optionsAccordion = screen.getByRole('button', { name: /send.sending_options/i })
    fireEvent.click(optionsAccordion)

    const collaborativeSwitch = document.querySelector('#switch-is-collaborative-transaction')
    expect(collaborativeSwitch).toBeInTheDocument()
    fireEvent.click(collaborativeSwitch!)

    expect(screen.queryByText('orderbook.alert_precheck_empty_title')).not.toBeInTheDocument()

    await flushActUpdates()
  })
})
