import type { TakerStatusResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SendFormValues } from '@/components/send/types'
import { jmSessionStore } from '@/store/jmSessionStore'
import { useJamSessionInfoContext, type PaymentAttempt } from './JamSessionInfoContext'
import { JamSessionInfoContextProvider } from './JamSessionInfoContextProvider'

const POLLING_INTERVAL = 50

const mocks = vi.hoisted(() => ({
  takerStatusQueryFn: vi.fn<() => Promise<TakerStatusResponse>>(),
  pollingInterval: 50,
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  getrescaninfoOptions: vi.fn(() => ({
    queryKey: ['rescan-info'],
    queryFn: vi.fn(),
  })),
  sessionOptions: vi.fn(() => ({
    queryKey: ['session'],
    // never resolves: session state is controlled via the store in these tests
    queryFn: () => new Promise(() => {}),
  })),
  takerstatusOptions: vi.fn(({ path }: { path: { walletname: string } }) => ({
    queryKey: ['taker-status', path.walletname],
    queryFn: () => mocks.takerStatusQueryFn(),
  })),
}))

vi.mock('@/constants/jam', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/constants/jam')>()
  return {
    ...actual,
    get RUNNING_COINJOIN_POLLING_INTERVAL() {
      return mocks.pollingInterval
    },
  }
})

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

const createPaymentAttempt = (createdAt: number): PaymentAttempt => ({
  createdAt,
  utxosHashHex: 'hash',
  walletFileName: 'wallet.jmdat',
  data: { isCoinJoin: true } as SendFormValues,
})

const Consumer = () => {
  const { takerInfo, setCurrentPaymentAttempt } = useJamSessionInfoContext()
  return (
    <div>
      <span data-testid="running">{String(takerInfo.running)}</span>
      <span data-testid="status">{takerInfo.status.value ?? '-'}</span>
      <span data-testid="txid">{takerInfo.__raw?.txid ?? '-'}</span>
      <button type="button" onClick={() => setCurrentPaymentAttempt(createPaymentAttempt(Date.now()))}>
        start
      </button>
    </div>
  )
}

const setSessionTakerActive = (active: boolean) => {
  jmSessionStore.getState().update({
    session: true,
    maker_running: false,
    coinjoin_in_process: active,
  })
}

const renderProvider = () => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <JamSessionInfoContextProvider walletFileName="wallet.jmdat">
        <Consumer />
      </JamSessionInfoContextProvider>
    </QueryClientProvider>,
  )
}

const sleep = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

describe('<JamSessionInfoContextProvider /> taker status', () => {
  beforeEach(() => {
    sessionStorage.clear()
    mocks.takerStatusQueryFn.mockReset()
    mocks.pollingInterval = POLLING_INTERVAL
    setSessionTakerActive(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches the taker status once on mount and does not poll while idle', async () => {
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: null })

    renderProvider()

    await waitFor(() => expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(1))
    await sleep(POLLING_INTERVAL * 4)
    expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(1)
  })

  it('does not poll endlessly when the endpoint is not available', async () => {
    mocks.takerStatusQueryFn.mockRejectedValue(new Error('404 Not Found'))

    renderProvider()

    await waitFor(() => expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(1))
    await sleep(POLLING_INTERVAL * 4)
    expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('status')).toHaveTextContent('-')
  })

  it('polls while running and stops once the taker reports a final outcome', async () => {
    mocks.takerStatusQueryFn
      .mockResolvedValueOnce({ running: true, status: 'filling' })
      .mockResolvedValueOnce({ running: true, status: 'broadcasting' })
      .mockResolvedValue({ running: false, status: 'complete', txid: 'new-txid' })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('complete'))
    expect(screen.getByTestId('running')).toHaveTextContent('false')
    expect(screen.getByTestId('txid')).toHaveTextContent('new-txid')

    const callCount = mocks.takerStatusQueryFn.mock.calls.length
    await sleep(POLLING_INTERVAL * 4)
    expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(callCount)
  })

  it('refetches the final outcome immediately when the session reports the taker has stopped', async () => {
    // polling must not be able to pick up the outcome during this test
    mocks.pollingInterval = 60_000
    setSessionTakerActive(true)
    mocks.takerStatusQueryFn.mockResolvedValue({ running: true, status: 'collecting_signatures' })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('collecting_signatures'))

    expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(1)

    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'failed', error: 'boom' })
    act(() => setSessionTakerActive(false))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'))
    expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('running')).toHaveTextContent('false')
  })

  it('ignores the outcome of a previous run for a new payment attempt', async () => {
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'complete', txid: 'old-txid' })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('txid')).toHaveTextContent('old-txid'))

    let resolveFreshStatus: ((value: TakerStatusResponse) => void) | undefined
    mocks.takerStatusQueryFn.mockImplementation(
      () =>
        new Promise<TakerStatusResponse>((resolve) => {
          resolveFreshStatus = resolve
        }),
    )

    act(() => screen.getByRole('button', { name: 'start' }).click())

    // the snapshot of the previous run must not be shown for the new attempt
    expect(screen.getByTestId('status')).toHaveTextContent('-')
    expect(screen.getByTestId('txid')).toHaveTextContent('-')

    // a new payment attempt triggers an immediate refetch
    await waitFor(() => expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(2))
    act(() => resolveFreshStatus?.({ running: true, status: 'fetching_orderbook' }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('fetching_orderbook'))
    expect(screen.getByTestId('running')).toHaveTextContent('true')
  })
})
