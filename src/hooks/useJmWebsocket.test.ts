import { renderHook, waitFor } from '@testing-library/react'
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

// These tests intentionally use real timers (the durations above are mocked to a
// few milliseconds) together with `waitFor`. The hook chains setTimeout -> state
// update -> setTimeout, and driving that with fake timers + act races under CI
// load; polling with real timers is deterministic regardless of machine load.
describe('useJmWebsocket', () => {
  beforeEach(() => {
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

    await waitFor(() => expect(mocks.sendMessage).toHaveBeenCalledWith('access-token'))
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
  })

  it('does not send auth messages when authentication is disabled', async () => {
    renderHook(() =>
      useJmWebsocket({
        config: { enableAuthentication: false, enableHeartbeat: true },
      }),
    )

    // give the auth/heartbeat timers ample time to fire if they were going to
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(mocks.sendMessage).not.toHaveBeenCalled()
  })

  it('sends heartbeat messages after authentication succeeds', async () => {
    renderHook(() =>
      useJmWebsocket({
        config: { enableAuthentication: true, enableHeartbeat: true },
      }),
    )

    // first call is the auth renewal, subsequent calls are heartbeat messages
    await waitFor(() => expect(mocks.sendMessage.mock.calls.length).toBeGreaterThanOrEqual(2))
    expect(mocks.sendMessage).toHaveBeenLastCalledWith('access-token')
  })
})
