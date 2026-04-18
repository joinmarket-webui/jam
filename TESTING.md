# Testing Guide

## Provider Wrapping

All component tests must render inside the full provider tree. Import `render` from `src/testUtils.tsx` instead of `@testing-library/react` — it wraps components with `I18nextProvider`, `SettingsProvider`, `WalletProvider`, `ServiceConfigProvider`, `WebsocketProvider`, and `ServiceInfoProvider`.

```tsx
// correct
import { render, screen } from '../../testUtils'

// incorrect — missing context
import { render, screen } from '@testing-library/react'
```

Components that use `react-router-dom` hooks (`useNavigate`, `Link`) also need a `BrowserRouter` wrapper:

```tsx
render(
  <BrowserRouter>
    <MyComponent />
  </BrowserRouter>
)
```

## API Mocking

Mock `src/libs/JmWalletApi` at the top of each test file. Spread `jest.requireActual` to keep type definitions and only override the functions you need:

```tsx
jest.mock('../../libs/JmWalletApi', () => ({
  ...jest.requireActual('../../libs/JmWalletApi'),
  postCoinjoin: jest.fn(),
  postDirectSend: jest.fn(),
}))
```

Use `neverResolves` for loading states, `Promise.resolve(mockResponse)` for success, `Promise.reject(new Error('...'))` for error states:

```tsx
const neverResolves = new Promise(() => {})
const successResponse = { ok: true, status: 200, json: async () => ({ result: 'ok' }) }

beforeEach(() => {
  ;(apiMock.postCoinjoin as jest.Mock).mockReturnValue(neverResolves)
})
```

## WebSocket Mocking

`jest-websocket-mock` is available as a devDependency. Create a mock server before each test and clean up after:

```tsx
import WS from 'jest-websocket-mock'

let wsServer: WS

beforeEach(() => {
  wsServer = new WS('wss://localhost/jmws')
})

afterEach(() => {
  WS.clean()
})
```

Simulate incoming messages to trigger state updates in `WebsocketProvider`:

```tsx
wsServer.send(JSON.stringify({ type: 'walletupdate', utxos: [] }))
```

## Coverage Enforcement

Coverage thresholds live in the `jest.coverageThreshold` block in `package.json`. CI runs `npm test -- --coverage --watchAll=false` which fails if any threshold is not met.

To raise thresholds after adding new tests:
1. Run `CI=true npm test -- --coverage --watchAll=false`
2. Check the `All files` row in the output
3. Update thresholds to `floor(new value)` in `package.json`
4. Commit and push
