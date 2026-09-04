import { act, renderHook } from '@testing-library/react'
import { ReadyState } from 'react-use-websocket'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION,
  JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION,
} from '@/constants/jam'
import { authStore } from '@/store/authStore'
import { useJmWebsocket } from './useJmWebsocket'

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  readyState: 0,
  websocketOptions: undefined as Record<string, unknown> | undefined,
}))

vi.mock('react-use-websocket/dist/lib/use-websocket', () => ({
  useWebSocket: vi.fn((_url: string, options: Record<string, unknown>) => {
    mocks.websocketOptions = options
    return {
      sendMessage: mocks.sendMessage,
      readyState: mocks.readyState,
      lastMessage: null,
      lastJsonMessage: null,
      getWebSocket: vi.fn(),
    }
  }),
}))

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    pseudoRandomFloat: () => 1,
  }
})

const AUTH_TOKEN = 'test-auth-token'

const setAuthToken = () => {
  authStore.setState({
    state: {
      auth: {
        token: AUTH_TOKEN,
        refresh_token: 'test-refresh-token',
        expiresAt: Date.now() + 1_800_000,
      },
    },
  })
}

describe('useJmWebsocket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.readyState = ReadyState.CONNECTING
    mocks.sendMessage.mockClear()
    mocks.websocketOptions = undefined
    authStore.setState({ state: undefined })
  })

  afterEach(() => {
    vi.useRealTimers()
    act(() => {
      authStore.setState({ state: undefined })
    })
  })

  it('reports closed and unauthenticated while connecting', () => {
    const { result } = renderHook(() =>
      useJmWebsocket({ config: { enableHeartbeat: false, enableAuthentication: false } }),
    )

    expect(result.current.isOpen).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.readyState).toBe(ReadyState.CONNECTING)
  })

  it('forwards websocket lifecycle callbacks', () => {
    const onOpen = vi.fn()
    const onClose = vi.fn()
    const onError = vi.fn()

    renderHook(() =>
      useJmWebsocket({
        config: { enableHeartbeat: false, enableAuthentication: false },
        options: { onOpen, onClose, onError },
      }),
    )

    const openEvent = new Event('open')
    const closeEvent = new CloseEvent('close')
    const errorEvent = new Event('error')

    act(() => {
      if (typeof mocks.websocketOptions?.onOpen === 'function') {
        ;(mocks.websocketOptions.onOpen as (event: unknown) => unknown)(openEvent)
      }
      if (typeof mocks.websocketOptions?.onClose === 'function') {
        ;(mocks.websocketOptions.onClose as (event: unknown) => unknown)(closeEvent)
      }
      if (typeof mocks.websocketOptions?.onError === 'function') {
        ;(mocks.websocketOptions.onError as (event: unknown) => unknown)(errorEvent)
      }
    })

    expect(onOpen).toHaveBeenCalledWith(openEvent)
    expect(onClose).toHaveBeenCalledWith(closeEvent)
    expect(onError).toHaveBeenCalledWith(errorEvent)
  })

  it('sends auth token and becomes authenticated when the connection is open', () => {
    setAuthToken()
    mocks.readyState = ReadyState.OPEN

    const { result, rerender } = renderHook(() =>
      useJmWebsocket({ config: { enableHeartbeat: false, enableAuthentication: true } }),
    )

    expect(result.current.isOpen).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)

    act(() => {
      vi.advanceTimersByTime(JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION)
    })
    rerender()

    expect(mocks.sendMessage).toHaveBeenCalledTimes(1)
    expect(mocks.sendMessage).toHaveBeenCalledWith(AUTH_TOKEN)
    expect(result.current.isAuthenticated).toBe(false)

    act(() => {
      vi.advanceTimersByTime(JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION)
    })
    rerender()

    expect(result.current.isAuthenticated).toBe(true)
  })

  it('resets authentication when the websocket closes', () => {
    setAuthToken()
    mocks.readyState = ReadyState.OPEN

    const { result, rerender } = renderHook(() =>
      useJmWebsocket({ config: { enableHeartbeat: false, enableAuthentication: true } }),
    )

    act(() => {
      vi.advanceTimersByTime(JAM_JM_WEBSOCKET_CONNECTION_HEALTHY_DURATION)
    })
    rerender()

    act(() => {
      vi.advanceTimersByTime(JAM_JM_WEBSOCKET_CONNECTION_AUTHENTICATED_DURATION)
    })
    rerender()
    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      if (typeof mocks.websocketOptions?.onClose === 'function') {
        ;(mocks.websocketOptions.onClose as (event: unknown) => unknown)(new CloseEvent('close'))
      }
    })
    rerender()

    expect(result.current.isAuthenticated).toBe(false)
  })
})
