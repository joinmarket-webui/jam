# Testing Guide

This repository uses **Vitest** (with Jest-style APIs: `describe`, `it`, `expect`, `vi`).

## Test structure

- **Unit tests**: `src/**/*.test.{ts,tsx}`
- **Main unit environment**: `jsdom` with setup in `vitest.setup.ts`
- **Storybook tests**: separate Vitest project (`storybook`)

Current layout examples:
- Pure logic tests in `src/lib/*.test.ts`
- Feature/component logic tests near source (for example `src/components/send/*.test.ts`)
- Hook tests near hooks (for example `src/hooks/useFeatures.test.ts`)

## Run tests and coverage

- Run all tests (all projects):

```bash
npm test
```

- Run unit tests only (recommended for local development):

```bash
npm run test:unit
```

- Run one file:

```bash
npm test -- src/hooks/useFeatures.test.ts
```

- Coverage (unit-focused, practical default):

```bash
npm run test:unit -- --coverage
```

- Coverage (all projects):

```bash
npm test -- --coverage
```

## Mocking APIs

Prefer module-level mocks with `vi.mock(...)` and keep tests deterministic.

Typical patterns in this repo:

```ts
vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }))
vi.mock('@/lib/api/logs', () => ({ fetchFeatures: vi.fn() }))
```

```ts
vi.mock('@joinmarket-webui/joinmarket-api-ts', () => ({
  createClient: vi.fn(() => ({ interceptors: { request: { use: vi.fn() } } })),
}))
```

Guidelines:
- Mock network boundaries (`fetch`, API clients, websocket hooks), not business logic.
- Reset mocks in `beforeEach` with `vi.clearAllMocks()`.
- Assert behavior (return values/state transitions), not implementation details.

## WebSocket behavior in tests

`useJmWebsocket` depends on timers, reconnect backoff, and heartbeat scheduling.

Recommended approach:
- Mock `react-use-websocket` and control `readyState` + `sendMessage` explicitly.
- Use fake timers for auth refresh and heartbeat intervals:

```ts
vi.useFakeTimers()
// trigger effects/timeouts
vi.advanceTimersByTime(ms)
```

- Verify:
  - auth token is sent after connection becomes healthy
  - `isAuthenticated` toggles on open/close paths
  - heartbeat sends are scheduled/cancelled correctly
- Always clean up timers/mocks in `afterEach`.

## Why Send/Earn flows require stricter testing

Send and Earn paths directly affect wallet safety and user funds.

High-risk areas include:
- amount/address validation
- collaborator/coinjoin preconditions
- fee and scheduling logic
- state transitions around confirmations and execution

Testing expectations for these flows:
- Cover boundary and invalid inputs (null/undefined/malformed/edge values)
- Prefer explicit, deterministic unit tests for validation and request-building logic
- Raise coverage thresholds for `src/components/send/` and `src/components/earn/` above global defaults
