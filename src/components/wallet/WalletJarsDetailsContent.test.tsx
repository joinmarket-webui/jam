import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountMeta, AccountSummary, AddressMeta, AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { WalletJarsDetailsContent } from './WalletJarsDetailsContent'

const { walletInfoRefetch, toastMocks, ...mocks } = vi.hoisted(() => ({
  walletInfoRefetch: vi.fn(),
  toastMocks: { success: vi.fn(), warning: vi.fn() },
  rescanning: false,
  takerRunning: false,
  makerRunning: false,
}))

vi.mock('sonner', () => ({
  toast: {
    success: (message: string) => {
      toastMocks.success(message)
    },
    warning: (message: string) => {
      toastMocks.warning(message)
    },
    dismiss: () => {},
  },
}))

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query', () => ({
  freezeMutation: vi.fn(() => ({ mutationFn: vi.fn() })),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn((options: { mutationFn?: (input: unknown) => Promise<unknown> }) => ({
    isPending: false,
    mutateAsync: async (input: unknown) => await (options.mutationFn?.(input) ?? Promise.resolve()),
  })),
}))

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

vi.mock('../ui/jam/Address', () => ({
  Address: ({ value }: { value: string }) => <span>{value}</span>,
}))

vi.mock('../ui/jam/Balance', () => ({
  Balance: ({ valueString }: { valueString: string }) => <span>{valueString}</span>,
}))

vi.mock('@/context/JamSessionInfoContext', () => ({
  useJamSessionInfoContext: () => ({
    takerInfo: { running: mocks.takerRunning },
    rescanInfo: { rescanning: mocks.rescanning },
    makerInfo: { running: mocks.makerRunning },
  }),
}))

const makeUtxo = (overrides: Partial<Utxo>): Utxo =>
  ({
    address: 'bc1qwallet-a',
    confirmations: 5,
    frozen: false,
    label: 'label-a',
    locktime: undefined,
    tries_remaining: 3,
    utxo: 'wallet-tx-a:0',
    value: 12_000,
    ...overrides,
  }) as Utxo

const jars: Jar[] = [
  {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 12_000,
      calculatedConfirmedAvailableBalanceInSats: 12_000,
      calculatedFrozenOrLockedBalanceInSats: 0,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedTotalBalanceInSats: 12_000,
    },
    color: '#e2b86a',
    jarIndex: 0,
    name: 'Zero',
    utxos: [makeUtxo({ address: 'bc1qwallet-a', utxo: 'wallet-tx-a:0' })],
  },
  {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 5_000,
      calculatedConfirmedAvailableBalanceInSats: 5_000,
      calculatedFrozenOrLockedBalanceInSats: 0,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedTotalBalanceInSats: 5_000,
    },
    color: '#3b5ba9',
    jarIndex: 1,
    name: 'One',
    utxos: [makeUtxo({ address: 'bc1qwallet-b', label: '', utxo: 'wallet-tx-b:1', value: 5_000 })],
  },
  {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 8_000,
      calculatedConfirmedAvailableBalanceInSats: 8_000,
      calculatedFrozenOrLockedBalanceInSats: 8_000,
      calculatedAvailableFrozenBalanceInSats: 8_000,
      calculatedTotalBalanceInSats: 8_000,
    },
    color: '#5ba93b',
    jarIndex: 2,
    name: 'Two',
    utxos: [makeUtxo({ address: 'bc1qwallet-c', frozen: true, label: '', utxo: 'wallet-tx-c:2', value: 8_000 })],
  },
]

const addressSummary: AddressSummary = {
  'bc1qwallet-a': {
    __raw: {} as unknown as AddressMeta['__raw'],
    address: 'bc1qwallet-a',
    info: undefined,
    jarIndex: 0,
    status: 'reused',
    used: true,
  },
  'bc1qwallet-b': {
    __raw: {} as unknown as AddressMeta['__raw'],
    address: 'bc1qwallet-b',
    info: undefined,
    jarIndex: 1,
    status: 'deposit',
    used: false,
  },
}

const accountSummary: AccountSummary = {
  0: {
    __raw: {} as unknown as AccountMeta['__raw'],
    branches: [],
    jarIndex: 0,
  },
}

vi.mock('@/context/JamWalletInfoContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/context/JamWalletInfoContext')>()),
  useAccountSummary: () => ({ accountSummary }),
  useAddressSummary: () => ({ addressSummary }),
  useJamWalletInfoContext: () => ({
    isFetching: false,
    refetch: walletInfoRefetch,
  }),
  useJars: () => ({ jars }),
}))

describe('WalletJarsDetailsContent', () => {
  beforeEach(() => {
    walletInfoRefetch.mockReset()
    walletInfoRefetch.mockResolvedValue({})
    toastMocks.success.mockReset()
    toastMocks.warning.mockReset()
    mocks.rescanning = false
    mocks.takerRunning = false
    mocks.makerRunning = false
    // vi.resetAllMocks()
  })

  it('renders successfully', () => {
    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" />)

    const jarTab = screen.getByRole('tab', { name: jars[0].name })
    expect(jarTab).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('bc1qwallet-a')).toBeInTheDocument()
  })

  it('renders selected jar UTXOs and debug details', async () => {
    const user = userEvent.setup()
    const jar = jars[1]

    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={jar.jarIndex} debug />)

    const jarTab = screen.getByRole('tab', { name: jar.name })
    expect(jarTab).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('bc1qwallet-b')).toBeInTheDocument()

    const devTab = screen.getByRole('tab', { name: /Dev/u })
    await user.click(devTab)
    expect(screen.getByText('activeJar:')).toBeInTheDocument()
  })

  it('switches jars with keyboard shortcuts and shows missing account information', async () => {
    const user = userEvent.setup()
    const jar = jars[1]

    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={jar.jarIndex} />)

    expect(screen.getByText('bc1qwallet-b')).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')

    expect(screen.getByText('bc1qwallet-a')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: jar.name }))

    await user.click(screen.getByRole('tab', { name: 'jar_details.title_tab_jar_details' }))

    expect(screen.getByText('jar_details.utxo_list.alert_no_account_info_title')).toBeInTheDocument()
  })

  it('does not register jar keyboard navigation when disabled', async () => {
    const user = userEvent.setup()

    render(<WalletJarsDetailsContent enabled={false} walletFileName="wallet.jmdat" selectedJarIndex={0} />)

    expect(screen.getByText('bc1qwallet-a')).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')

    expect(screen.getByText('bc1qwallet-a')).toBeInTheDocument()
  })

  it('shows the reused-address alert for a reused jar', () => {
    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={0} />)
    expect(screen.getByText(/jar_details\.utxo_list\.alert_reused_address/u)).toBeInTheDocument()
  })

  it('refreshes wallet info from the utxos tab', async () => {
    const user = userEvent.setup()
    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={1} />)

    const refreshButton = screen.getByRole('button', { name: 'global.refresh' })
    expect(refreshButton).toBeEnabled()

    await user.click(refreshButton)
    expect(walletInfoRefetch).toHaveBeenCalled()
  })

  it('freezes the selected (unfrozen) utxos', async () => {
    const user = userEvent.setup()
    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={1} />)

    const freezeButton = screen.getByRole('button', { name: 'jar_details.utxo_list.button_freeze' })
    expect(freezeButton).toBeDisabled()

    const dataRow = screen.getAllByRole('row').find((row) => within(row).queryByText('bc1qwallet-b'))!
    await user.click(within(dataRow).getByRole('checkbox'))

    expect(freezeButton).toBeEnabled()

    await user.click(freezeButton)
    await waitFor(() =>
      expect(toastMocks.success).toHaveBeenCalledWith('jar_details.utxo_list.toast_freeze_success:{"count":1}'),
    )
    expect(walletInfoRefetch).toHaveBeenCalled()
  })

  it('unfreezes the selected (frozen) utxos', async () => {
    const user = userEvent.setup()
    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={2} />)

    const unfreezeButton = screen.getByRole('button', { name: 'jar_details.utxo_list.button_unfreeze' })
    expect(unfreezeButton).toBeDisabled()

    const dataRow = screen.getAllByRole('row').find((row) => within(row).queryByText('bc1qwallet-c'))!
    await user.click(within(dataRow).getByRole('checkbox'))

    expect(unfreezeButton).toBeEnabled()

    await user.click(unfreezeButton)
    await waitFor(() =>
      expect(toastMocks.success).toHaveBeenCalledWith('jar_details.utxo_list.toast_unfreeze_success:{"count":1}'),
    )
    expect(walletInfoRefetch).toHaveBeenCalled()
  })

  it.each(['taker', 'maker', 'rescan'])('disables freeze/unfreeze if rescan/maker/taker is running', async (value) => {
    const user = userEvent.setup()
    mocks.takerRunning = value === 'taker'
    mocks.makerRunning = value === 'maker'
    mocks.rescanning = value === 'rescan'

    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={1} />)

    const freezeButton = screen.getByRole('button', { name: 'jar_details.utxo_list.button_freeze' })
    expect(freezeButton).toBeDisabled()

    const unfreezeButton = screen.getByRole('button', { name: 'jar_details.utxo_list.button_unfreeze' })
    expect(unfreezeButton).toBeDisabled()

    const dataRow = screen.getAllByRole('row').find((row) => within(row).queryByText('bc1qwallet-b'))!
    await user.click(within(dataRow).getByRole('checkbox'))

    expect(freezeButton).toBeDisabled()
    expect(unfreezeButton).toBeDisabled()
  })
})
