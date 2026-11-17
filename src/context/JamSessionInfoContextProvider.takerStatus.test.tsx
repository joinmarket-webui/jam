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
  const { takerInfo, setCurrentPaymentAttempt, clearCurrentPaymentAttempt } = useJamSessionInfoContext()
  return (
    <div>
      <span data-testid="running">{String(takerInfo.running)}</span>
      <span data-testid="status">{takerInfo.status.value ?? '-'}</span>
      <span data-testid="txid">{takerInfo.__raw?.txid ?? '-'}</span>
      <button type="button" onClick={() => setCurrentPaymentAttempt(createPaymentAttempt(Date.now()))}>
        start
      </button>
      <button type="button" onClick={clearCurrentPaymentAttempt}>
        clear
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

// the payment attempt is kept in memory, hence it must not leak into the next test
const clearPaymentAttempt = () => {
  mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: null })
  const { unmount } = renderProvider()
  act(() => screen.getByRole('button', { name: 'clear' }).click())
  unmount()
}

const sleep = (ms: number) => act(() => new Promise((resolve) => setTimeout(resolve, ms)))

describe('<JamSessionInfoContextProvider /> taker status', () => {
  beforeEach(() => {
    clearPaymentAttempt()
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

  it('reports the outcome of a new payment attempt that ended before it was observed running', async () => {
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'complete', txid: 'old-txid' })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('txid')).toHaveTextContent('old-txid'))

    // the backend resets the previous outcome before accepting a new attempt, hence
    // a snapshot fetched after the attempt has been made belongs to the new run
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'failed', error: 'no offers' })

    act(() => screen.getByRole('button', { name: 'start' }).click())

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'))
    expect(screen.getByTestId('txid')).toHaveTextContent('-')
    expect(screen.getByTestId('running')).toHaveTextContent('false')
  })

  it('keeps the outcome of a payment attempt when another taker run starts afterwards', async () => {
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'failed', error: 'no offers' })

    renderProvider()

    act(() => screen.getByRole('button', { name: 'start' }).click())
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'))

    // e.g. a taker started by the scheduler or from another session
    mocks.takerStatusQueryFn.mockResolvedValue({ running: true, status: 'filling' })
    act(() => setSessionTakerActive(true))
    await waitFor(() => expect(screen.getByTestId('running')).toHaveTextContent('true'))

    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'complete', txid: 'unrelated-txid' })
    act(() => setSessionTakerActive(false))
    await waitFor(() => expect(screen.getByTestId('running')).toHaveTextContent('false'))
    await sleep(POLLING_INTERVAL * 2)

    expect(screen.getByTestId('status')).toHaveTextContent('failed')
    expect(screen.getByTestId('txid')).toHaveTextContent('-')
  })

  it('keeps the outcome of a payment attempt across a remount', async () => {
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'failed', error: 'no offers' })

    const { unmount } = renderProvider()

    act(() => screen.getByRole('button', { name: 'start' }).click())
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'))
    unmount()

    // an unrelated run has ended in the meantime
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'complete', txid: 'unrelated-txid' })
    renderProvider()

    await waitFor(() => expect(mocks.takerStatusQueryFn).toHaveBeenCalled())
    await sleep(POLLING_INTERVAL * 2)
    expect(screen.getByTestId('status')).toHaveTextContent('failed')
    expect(screen.getByTestId('txid')).toHaveTextContent('-')
  })

  it('reports the live taker status again once the payment attempt has been cleared', async () => {
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'failed', error: 'no offers' })

    renderProvider()

    act(() => screen.getByRole('button', { name: 'start' }).click())
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'))

    mocks.takerStatusQueryFn.mockResolvedValue({ running: true, status: 'filling' })
    act(() => setSessionTakerActive(true))
    await waitFor(() => expect(screen.getByTestId('running')).toHaveTextContent('true'))
    expect(screen.getByTestId('status')).toHaveTextContent('failed')

    act(() => screen.getByRole('button', { name: 'clear' }).click())
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('filling'))
  })

  it('does not keep an outcome while the taker is still running', async () => {
    setSessionTakerActive(true)
    mocks.takerStatusQueryFn.mockResolvedValue({ running: true, status: 'filling' })

    renderProvider()

    act(() => screen.getByRole('button', { name: 'start' }).click())
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('filling'))

    mocks.takerStatusQueryFn.mockResolvedValue({ running: true, status: 'broadcasting' })
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('broadcasting'))

    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'complete', txid: 'new-txid' })
    act(() => setSessionTakerActive(false))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('complete'))
    expect(screen.getByTestId('txid')).toHaveTextContent('new-txid')
  })

  it('ignores a snapshot requested before the payment attempt even if it arrives afterwards', async () => {
    let resolveInFlightStatus: ((value: TakerStatusResponse) => void) | undefined
    mocks.takerStatusQueryFn.mockImplementationOnce(
      () =>
        new Promise<TakerStatusResponse>((resolve) => {
          resolveInFlightStatus = resolve
        }),
    )
    mocks.takerStatusQueryFn.mockResolvedValue({ running: true, status: 'fetching_orderbook' })

    renderProvider()
    await waitFor(() => expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(1))

    await sleep(5)
    act(() => screen.getByRole('button', { name: 'start' }).click())

    // the response of the request made before the attempt reports the outcome of a previous run
    await act(async () => {
      resolveInFlightStatus?.({ running: false, status: 'complete', txid: 'old-txid' })
      await Promise.resolve()
    })
    expect(screen.getByTestId('txid')).toHaveTextContent('-')
    expect(screen.getByTestId('status')).not.toHaveTextContent('complete')

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('fetching_orderbook'))
    expect(screen.getByTestId('txid')).toHaveTextContent('-')
  })

  it('keeps polling for the outcome of a payment attempt after a failed request', async () => {
    mocks.takerStatusQueryFn.mockResolvedValue({ running: false, status: 'complete', txid: 'old-txid' })

    renderProvider()

    await waitFor(() => expect(screen.getByTestId('txid')).toHaveTextContent('old-txid'))

    mocks.takerStatusQueryFn
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ running: false, status: 'failed', error: 'no offers' })

    act(() => screen.getByRole('button', { name: 'start' }).click())

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('failed'))

    // polling stops once the outcome is known
    const callCount = mocks.takerStatusQueryFn.mock.calls.length
    await sleep(POLLING_INTERVAL * 4)
    expect(mocks.takerStatusQueryFn).toHaveBeenCalledTimes(callCount)
  })
})
