import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountSummary, AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { WalletJarsDetailsContent } from './WalletJarsDetailsContent'

const walletInfoRefetch = vi.hoisted(() => vi.fn())

vi.mock('react-i18next', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
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
      calculatedTotalBalanceInSats: 5_000,
    },
    color: '#3b5ba9',
    jarIndex: 1,
    name: 'One',
    utxos: [makeUtxo({ address: 'bc1qwallet-b', label: '', utxo: 'wallet-tx-b:1', value: 5_000 })],
  },
]

const addressSummary: AddressSummary = {
  'bc1qwallet-a': {
    __raw: {},
    address: 'bc1qwallet-a',
    info: undefined,
    jarIndex: 0,
    status: 'reused',
    used: true,
  },
  'bc1qwallet-b': {
    __raw: {},
    address: 'bc1qwallet-b',
    info: undefined,
    jarIndex: 1,
    status: 'deposit',
    used: false,
  },
}

const accountSummary: AccountSummary = {
  0: {
    __raw: {},
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
  })

  it('renders selected jar UTXOs and debug details', async () => {
    const user = userEvent.setup()

    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={1} debug />)

    expect(screen.getByRole('tab', { name: 'One' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByText('bc1qwallet-b')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Dev/u }))
    expect(screen.getByText('activeJar:')).toBeInTheDocument()
  })

  it('switches jars with keyboard shortcuts and shows missing account information', async () => {
    const user = userEvent.setup()

    render(<WalletJarsDetailsContent enabled walletFileName="wallet.jmdat" selectedJarIndex={1} />)

    expect(screen.getByText('bc1qwallet-b')).toBeInTheDocument()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByText('bc1qwallet-a')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'One' }))
    await user.click(screen.getByRole('tab', { name: 'jar_details.title_tab_jar_details' }))
    expect(screen.getByText('jar_details.utxo_list.alert_no_account_info_title')).toBeInTheDocument()
  })

  it('does not register jar keyboard navigation when disabled', async () => {
    const user = userEvent.setup()

    render(<WalletJarsDetailsContent enabled={false} walletFileName="wallet.jmdat" selectedJarIndex={0} />)

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('bc1qwallet-a')).toBeInTheDocument()
  })
})
