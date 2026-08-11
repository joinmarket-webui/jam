import { render, screen, waitFor } from '@testing-library/react'
import { Network } from 'bitcoin-address-validation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletInfoApiObject } from '@/hooks/useQueryDisplayWallet'
import type { Utxo } from '@/hooks/useQueryUtxos'
import { useJamWalletInfoContext } from './JamWalletInfoContext'
import { JamWalletInfoContextProvider } from './JamWalletInfoContextProvider'

const mocks = vi.hoisted(() => ({
  utxos: [] as Utxo[],
  walletInfo: undefined as WalletInfoApiObject | undefined,
  utxosRefetch: vi.fn(),
  displayWalletRefetch: vi.fn(),
  waitQueryError: null as Error | null,
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useMutation: vi.fn(
      (options: { mutationFn?: (variables?: { delayBefore?: number; signal?: AbortSignal }) => Promise<unknown> }) => ({
        isPending: false,
        mutateAsync: options.mutationFn,
      }),
    ),
    useQuery: vi.fn(() => ({
      error: mocks.waitQueryError,
    })),
  }
})

vi.mock('@/hooks/useQueryUtxos', () => ({
  useQueryUtxos: () => ({
    utxos: mocks.utxos,
    queryResult: {
      data: { utxos: mocks.utxos },
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: mocks.utxosRefetch,
    },
  }),
}))

vi.mock('@/hooks/useQueryDisplayWallet', () => ({
  useQueryDisplayWallet: () => ({
    walletInfo: mocks.walletInfo,
    queryResult: {
      data: { walletinfo: mocks.walletInfo },
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: mocks.displayWalletRefetch,
    },
  }),
}))

const txid = (char: string) => char.repeat(64)
const address = 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx'

const utxo = (overrides: Partial<Utxo>): Utxo => ({
  utxo: `${txid('a')}:0`,
  address,
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

const walletInfo = (status = 'new'): WalletInfoApiObject =>
  ({
    wallet_name: 'testing.jmdat',
    total_balance: '0',
    accounts: [
      {
        account: '0',
        branches: [
          {
            branch: "external addresses\tm/84'/1'/0'/0",
            entries: [
              {
                address,
                hd_path: "m/84'/1'/0'/0/0",
                status,
                label: '',
                balance: 0,
                used_count: 0,
              },
            ],
          },
        ],
      },
    ],
  }) as unknown as WalletInfoApiObject

const CaptureWalletInfo = ({
  onContext,
}: {
  onContext: (context: ReturnType<typeof useJamWalletInfoContext>) => void
}) => {
  const context = useJamWalletInfoContext()
  onContext(context)
  return <div>{context.walletName}</div>
}

describe('<JamWalletInfoContextProvider />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.waitQueryError = null
    mocks.utxos = [
      utxo({ utxo: `${txid('a')}:0`, value: 50_000, mixdepth: 0 }),
      utxo({ utxo: `${txid('b')}:1`, value: 75_000, mixdepth: 7, label: 'unknown jar' }),
      utxo({
        utxo: `${txid('c')}:2`,
        value: 150_000,
        mixdepth: 0,
        locktime: '2999-01-01 00:00:00',
        path: "m/84'/1'/0'/0/2:32503680000",
      }),
    ]
    mocks.walletInfo = walletInfo()
    mocks.utxosRefetch.mockResolvedValue({ data: { utxos: [utxo({ value: 25_000 })] } })
    mocks.displayWalletRefetch.mockResolvedValue({ data: { walletinfo: walletInfo() } })
  })

  it('combines wallet display data with utxos into jar, address, and account summaries', () => {
    let context: ReturnType<typeof useJamWalletInfoContext> | undefined

    render(
      <JamWalletInfoContextProvider walletFileName="testing.jmdat">
        <CaptureWalletInfo onContext={(value) => (context = value)} />
      </JamWalletInfoContextProvider>,
    )

    expect(screen.getByText('testing')).toBeInTheDocument()
    expect(context?.walletName).toBe('testing')
    expect(context?.jars.map((jar) => jar.jarIndex)).toEqual([0, 1, 2, 3, 4, 7])
    expect(context?.jars.find((jar) => jar.jarIndex === 7)?.name).toBe('Jar #7')
    expect(context?.fidelityBondSummary.fbOutputs.map((entry) => entry.utxo)).toEqual([`${txid('c')}:2`])
    expect(context?.hasEligibleFidelityBondUtxo).toBe(false)
    expect(context?.accountSummary[0].branches[0]).toMatchObject({
      type: 'external addresses',
      derivation: "m/84'/1'/0'/0",
    })
    expect(context?.addressSummary[address]).toMatchObject({
      jarIndex: 0,
      used: false,
      status: 'new',
    })
    expect(context?.detectedNetwork).toBe(Network.regtest)
    expect(context?.isLoading).toBe(false)
    expect(context?.isFetching).toBe(false)
    expect(context?.error).toBeNull()
  })

  it('reports when an eligible fidelity-bond UTXO is available', () => {
    let context: ReturnType<typeof useJamWalletInfoContext> | undefined
    mocks.walletInfo = walletInfo('cj-out')

    render(
      <JamWalletInfoContextProvider walletFileName="testing.jmdat">
        <CaptureWalletInfo onContext={(value) => (context = value)} />
      </JamWalletInfoContextProvider>,
    )

    expect(context?.hasEligibleFidelityBondUtxo).toBe(true)
  })

  it('handles malformed accounts, missing branches, and entries without a status', () => {
    let context: ReturnType<typeof useJamWalletInfoContext> | undefined
    mocks.walletInfo = {
      accounts: [
        { account: undefined, branches: [] },
        { account: '0', branches: undefined },
        {
          account: '1',
          branches: [
            {
              branch: "external addresses\tm/84'/1'/1'/0",
              entries: [
                { address, hd_path: "m/84'/1'/1'/0/0", status: undefined, label: '', balance: 0, used_count: 0 },
                { address: '', hd_path: "m/84'/1'/1'/0/1", status: 'new', label: '', balance: 0, used_count: 0 },
              ],
            },
          ],
        },
      ],
    } as unknown as WalletInfoApiObject

    render(
      <JamWalletInfoContextProvider walletFileName="testing.jmdat">
        <CaptureWalletInfo onContext={(value) => (context = value)} />
      </JamWalletInfoContextProvider>,
    )

    // entry without a status and entry without an address are both skipped
    expect(context?.addressSummary[address]).toBeUndefined()
  })

  it('sorts multiple fidelity bonds by lock state and value', () => {
    let context: ReturnType<typeof useJamWalletInfoContext> | undefined
    mocks.utxos = [
      utxo({
        utxo: `${txid('d')}:0`,
        value: 100_000,
        locktime: '2999-01-01 00:00:00',
        path: "m/84'/1'/0'/0/0:32503680000",
      }),
      utxo({
        utxo: `${txid('e')}:1`,
        value: 300_000,
        locktime: '2999-01-01 00:00:00',
        path: "m/84'/1'/0'/0/1:32503680000",
      }),
      utxo({
        utxo: `${txid('f')}:2`,
        value: 200_000,
        locktime: '2000-01-01 00:00:00',
        path: "m/84'/1'/0'/0/2:946684800",
      }),
    ]

    render(
      <JamWalletInfoContextProvider walletFileName="testing.jmdat">
        <CaptureWalletInfo onContext={(value) => (context = value)} />
      </JamWalletInfoContextProvider>,
    )

    const fbUtxos = context?.fidelityBondSummary.fbOutputs.map((entry) => entry.utxo)
    // both locked bonds come before the expired one; higher value wins among locked
    expect(fbUtxos).toHaveLength(3)
    expect(fbUtxos?.slice(0, 2)).toEqual([`${txid('e')}:1`, `${txid('d')}:0`])
  })

  it('detects the network from a utxo sample when no address info is available', () => {
    let context: ReturnType<typeof useJamWalletInfoContext> | undefined
    mocks.walletInfo = undefined
    mocks.utxos = [utxo({ utxo: `${txid('a')}:0`, external: false })]

    render(
      <JamWalletInfoContextProvider walletFileName="testing.jmdat">
        <CaptureWalletInfo onContext={(value) => (context = value)} />
      </JamWalletInfoContextProvider>,
    )

    expect(context?.detectedNetwork).toBe(Network.regtest)
  })

  it('applies a delay before refetching when requested', async () => {
    let context: ReturnType<typeof useJamWalletInfoContext> | undefined

    render(
      <JamWalletInfoContextProvider walletFileName="testing.jmdat">
        <CaptureWalletInfo onContext={(value) => (context = value)} />
      </JamWalletInfoContextProvider>,
    )

    await context?.refetch({ delayBefore: 1 })
    expect(mocks.utxosRefetch).toHaveBeenCalledWith({ throwOnError: true })
  })

  it('refetches utxos before refreshing display wallet data', async () => {
    let context: ReturnType<typeof useJamWalletInfoContext> | undefined

    render(
      <JamWalletInfoContextProvider walletFileName="testing.jmdat">
        <CaptureWalletInfo onContext={(value) => (context = value)} />
      </JamWalletInfoContextProvider>,
    )

    const balanceSummary = await context?.refetch()

    await waitFor(() => expect(mocks.utxosRefetch).toHaveBeenCalledWith({ throwOnError: true }))
    expect(mocks.displayWalletRefetch).toHaveBeenCalledWith({ throwOnError: true })
    expect(balanceSummary?.calculatedTotalBalanceInSats).toBe(25_000)
  })
})
