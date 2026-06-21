import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { jmTxStore } from '@/store/jmTxStore'
import { useJmWebsocketContext } from './JmWebsocketContext'
import { JmWebsocketContextProvider } from './JmWebsocketContextProvider'

const mocks = vi.hoisted(() => ({
  useJmWebsocket: vi.fn(),
  websocket: {
    isOpen: true,
    isAuthenticated: true,
    readyState: 1,
    getWebSocket: vi.fn(),
    lastJsonMessage: null,
    lastMessage: null,
    messageHistory: [],
    readyStateFromUrl: {},
  },
}))

vi.mock('@/hooks/useJmWebsocket', () => ({
  useJmWebsocket: mocks.useJmWebsocket,
}))

const Consumer = () => {
  const { websocket } = useJmWebsocketContext()
  return <div>{websocket.isOpen ? 'open' : 'closed'}</div>
}

const lastOnMessage = () => {
  const config = mocks.useJmWebsocket.mock.calls.at(-1)?.[0] as {
    options: { onMessage: (event: MessageEvent) => void }
  }
  return config.options.onMessage
}

describe('<JmWebsocketContextProvider />', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    jmTxStore.getState().clear()
    mocks.useJmWebsocket.mockReturnValue(mocks.websocket)
  })

  it('provides websocket state to consumers', () => {
    render(
      <JmWebsocketContextProvider>
        <Consumer />
      </JmWebsocketContextProvider>,
    )

    expect(screen.getByText('open')).toBeInTheDocument()
    expect(mocks.useJmWebsocket).toHaveBeenCalledWith(
      expect.objectContaining({
        config: {
          enableAuthentication: true,
          enableHeartbeat: true,
        },
      }),
    )
  })

  it('stores valid transaction updates from websocket messages', () => {
    render(
      <JmWebsocketContextProvider>
        <Consumer />
      </JmWebsocketContextProvider>,
    )

    const onMessage = lastOnMessage()
    const txid = 'a'.repeat(64)

    onMessage(
      new MessageEvent('message', {
        data: JSON.stringify({
          txid,
          txdetails: { txid, outs: [] },
        }),
      }),
    )
    onMessage(new MessageEvent('message', { data: JSON.stringify({ txid: 'short', txdetails: { txid: 'short' } }) }))

    expect(jmTxStore.getState().get(txid)).toEqual({ txid, outs: [] })
    expect(jmTxStore.getState().get('short')).toBeUndefined()
  })

  it('ignores malformed websocket payloads', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    render(
      <JmWebsocketContextProvider>
        <Consumer />
      </JmWebsocketContextProvider>,
    )

    const onMessage = lastOnMessage()

    expect(() => onMessage(new MessageEvent('message', { data: '{bad-json' }))).not.toThrow()
    expect(warn).toHaveBeenCalledWith('Error parsing websocket message', '{bad-json')

    warn.mockRestore()
  })
})
