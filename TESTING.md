# Testing in Jam

Jam uses Jest and React Testing Library for both unit and component coverage.
The existing test harness already sets up the core providers and websocket mock,
so most tests can focus on the feature behavior instead of the plumbing.

## Shared test wrapper

Use the shared renderer from `src/testUtils.tsx` when a component needs the repo's
standard providers:

```ts
import { render, screen } from '../testUtils'

render(<MyComponent />)
expect(screen.getByText('...')).toBeInTheDocument()
```

That wrapper already includes:

- `I18nextProvider`
- `SettingsProvider`
- `WalletProvider`
- `ServiceConfigProvider`
- `WebsocketProvider`
- `ServiceInfoProvider`

## API mocking

The repo usually mocks the API layer directly with `jest.mock(...)` and then
fills in return values per test.

Example:

```ts
import * as apiMock from '../libs/JmWalletApi'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getSession: jest.fn(),
  getGetinfo: jest.fn(),
}))

;(apiMock.getSession as jest.Mock).mockReturnValue(Promise.resolve({ ok: true }))
```

This keeps the component tests deterministic while still exercising the real UI
and state transitions.

## WebSocket mocking

`src/setupTests.ts` creates a reusable websocket server mock:

```ts
await global.__DEV__.JM_WEBSOCKET_SERVER_MOCK.connected
global.__DEV__.JM_WEBSOCKET_SERVER_MOCK.close()
```

That is useful for tests that need to verify connected/disconnected UI states
without talking to a real backend.

## Provider and async patterns

- Wrap components in `act(...)` when they trigger asynchronous state updates.
- Prefer `waitFor(...)` or `findBy...` queries when the UI updates after a promise.
- Reuse the repo's translation and provider setup instead of creating ad-hoc wrappers.

## Coverage contract

CI runs Jest with coverage enabled, and `package.json` enforces a baseline threshold.
When adding larger features, extend the relevant tests first, then raise the threshold
only when the suite is ready for it.
