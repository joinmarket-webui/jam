import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SendFormValues } from '@/components/send/types'
import { jmSessionStore } from '@/store/jmSessionStore'
import { useJamSessionInfoContext } from './JamSessionInfoContext'
import { JamSessionInfoContextProvider } from './JamSessionInfoContextProvider'

const mocks = vi.hoisted(() => ({
  rescanData: undefined as { rescanning: boolean; progress?: number } | undefined,
  dataUpdatedAt: 0,
}))

vi.mock('@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query', () => ({
  getrescaninfoOptions: vi.fn(() => ({
    queryKey: ['rescan-info'],
    queryFn: vi.fn(),
  })),
}))

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    useQuery: vi.fn(() => ({
      data: mocks.rescanData,
      dataUpdatedAt: mocks.dataUpdatedAt,
    })),
  }
})

vi.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => ({}),
}))

const paymentAttempt = {
  createdAt: 1,
  utxosHashHex: 'hash',
  walletFileName: 'wallet.jmdat',
  data: { isCoinJoin: true } as SendFormValues,
}

const Consumer = () => {
  const context = useJamSessionInfoContext()
  return (
    <div>
      <span>{context.blockHeight}</span>
      <span>{context.takerInfo.running ? 'running' : 'idle'}</span>
      <span>{context.takerInfo.currentPaymentAttempt?.walletFileName ?? 'no-payment'}</span>
      <span>{context.rescanInfo.progress ?? 0}</span>
      <button type="button" onClick={() => context.setCurrentPaymentAttempt(paymentAttempt)}>
        set
      </button>
      <button type="button" onClick={() => context.clearCurrentPaymentAttempt()}>
        clear
      </button>
    </div>
  )
}

describe('<JamSessionInfoContextProvider />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mocks.rescanData = undefined
    mocks.dataUpdatedAt = 0
    jmSessionStore.getState().update({
      block_height: 123,
      coinjoin_in_process: true,
      rescanning: false,
    })
  })

  it('provides session state and payment attempt helpers', () => {
    render(
      <JamSessionInfoContextProvider walletFileName="wallet.jmdat">
        <Consumer />
      </JamSessionInfoContextProvider>,
    )

    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('running')).toBeInTheDocument()
    expect(screen.getByText('no-payment')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'set' }).click())
    expect(screen.getByText('wallet.jmdat')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'clear' }).click())
    expect(screen.getByText('no-payment')).toBeInTheDocument()
  })

  it('uses newer rescan query data when available', () => {
    mocks.rescanData = { rescanning: false, progress: 0.5 }
    mocks.dataUpdatedAt = 100
    jmSessionStore.getState().update({
      block_height: 123,
      coinjoin_in_process: false,
      rescanning: true,
    })

    render(
      <JamSessionInfoContextProvider walletFileName="wallet.jmdat">
        <Consumer />
      </JamSessionInfoContextProvider>,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
