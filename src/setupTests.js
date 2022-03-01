// react-testing-library renders your components to document.body,
// this adds jest-dom's custom assertions
import '@testing-library/jest-dom'
import { WS as WebSocketServer } from 'jest-websocket-mock'

global.JM = {
  SETTINGS_STORE_KEY: 'jm-settings',
  THEMES: ['light', 'dark'],
  THEME_ROOT_ATTR: 'data-theme',
}

global.JM_WEBSOCKET_SERVER_MOCK = new WebSocketServer('ws://localhost/jmws', { jsonProtocol: true })

beforeEach(async () => {
  await global.JM_WEBSOCKET_SERVER_MOCK.connected
})

afterEach(() => {
  // gracefully close all open connections and reset the environment between test runs
  WebSocketServer.clean()
})

afterAll(() => {
  global.JM_WEBSOCKET_SERVER_MOCK.close()
})
