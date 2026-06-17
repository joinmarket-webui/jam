import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authStore } from '@/store/authStore'
import { useJmWebsocket } from './useJmWebsocket'

const mocks = vi.hoisted(() => ({
  readyState: 1,
  sendMessage: vi.fn(),
  useWebSocket: vi.fn(),
}))

vi.mock('react-use-websocket', () => ({
  default: mocks.useWebSocket,
  ReadyState: {
    UNINSTANTIATED: -1,
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  },
}))

vi.mock('@/constants/jam', () => ({
  JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION: 10,
  JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION: 20,
  JAM_JM_WEBSOCKET_KEEPALIVE_MESSAGE_INTERVAL: 30,
  JAM_JM_WEBSOCKET_RECONNECT_INTERVAL_MAX: 60_000,
  JAM_JM_WEBSOCKET_RECONNECT_INTERVAL_MIN: 5_000,
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  pseudoRandomFloat: vi.fn(() => 1),
}))

describe('useJmWebsocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.readyState = 1
    mocks.useWebSocket.mockImplementation((_url: string, options: unknown) => ({
      readyState: mocks.readyState,
      getWebSocket: vi.fn(),
      lastJsonMessage: null,
      lastMessage: null,
      messageHistory: [],
      readyStateFromUrl: {},
      sendJsonMessage: vi.fn(),
      sendMessage: mocks.sendMessage,
      staticOptions: options,
    }))
    authStore.getState().clear()
    authStore.getState().update({ auth: { token: 'access-token', refresh_token: 'refresh-token' } })
  })

  afterEach(() => {
    vi.useRealTimers()
    authStore.getState().clear()
  })

  it('renews authentication when the websocket stays open', async () => {
    const { result } = renderHook(() =>
      useJmWebsocket({
        config: { enableAuthentication: true, enableHeartbeat: false },
      }),
    )

    expect(result.current.isOpen).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)

    // advanceTimersByTimeAsync flushes microtasks (and the React effects they
    // trigger) between timers, so the chained auth -> authenticated timers are
    // scheduled deterministically rather than racing the next advance.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })

    expect(mocks.sendMessage).toHaveBeenCalledWith('access-token')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })

    expect(result.current.isAuthenticated).toBe(true)
  })

  it('does not send auth messages when authentication is disabled', async () => {
    renderHook(() =>
      useJmWebsocket({
        config: { enableAuthentication: false, enableHeartbeat: true },
      }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(mocks.sendMessage).not.toHaveBeenCalled()
  })

  it('sends heartbeat messages after authentication succeeds', async () => {
    renderHook(() =>
      useJmWebsocket({
        config: { enableAuthentication: true, enableHeartbeat: true },
      }),
    )

    // flush each chained timer (auth -> authenticated -> heartbeat interval ->
    // delayed heartbeat send) with the async variant to avoid CI timing races.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30)
    })

    expect(mocks.sendMessage).toHaveBeenCalledTimes(2)
    expect(mocks.sendMessage).toHaveBeenLastCalledWith('access-token')
  })
})
