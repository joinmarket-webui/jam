// react-testing-library renders your components to document.body,
// this adds jest-dom's custom assertions
import '@testing-library/jest-dom'
import { WS as WebSocketServer } from 'jest-websocket-mock'

global.JM = {
  SETTINGS_STORE_KEY: 'jm-settings',
  THEMES: ['light', 'dark'],
  THEME_ROOT_ATTR: 'data-theme',
  PUBLIC_PATH: '',
}

global.__DEV__ = {}

global.__DEV__.addToAppSettings = () => {
  global.localStorage.setItem(
    global.JM.SETTINGS_STORE_KEY,
    JSON.stringify(
      Object.assign({}, global.localStorage.getItem(global.JM.SETTINGS_STORE_KEY) || {}, {
        showOnboarding: false,
      }),
    ),
  )
}
;(function setupWebsocketServerMock() {
  global.__DEV__.JM_WEBSOCKET_SERVER_MOCK = new WebSocketServer('ws://localhost/jmws', { jsonProtocol: true })

  afterEach(() => {
    // gracefully close all open connections and reset the environment between test runs
    WebSocketServer.clean()
  })

  afterAll(() => {
    global.__DEV__.JM_WEBSOCKET_SERVER_MOCK.close()
  })
})()

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated, still needed by @restart/hooks (last check: 2022-05-25)
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  })
})
