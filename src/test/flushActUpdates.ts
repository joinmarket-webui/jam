import { act } from '@testing-library/react'

/**
 * Flushes pending microtask-scheduled React state updates (e.g. react-hook-form
 * validation, react-query effects, store subscriptions) inside `act(...)`.
 *
 * Some components schedule a state update right after mount or after a
 * `fireEvent`, which resolves on a later microtask. When a test asserts
 * synchronously and returns, that update lands outside `act(...)` and React
 * logs a "not wrapped in act(...)" warning. Awaiting this at the end of such a
 * test flushes the update inside `act` so the warning is not produced.
 */
export const flushActUpdates = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve()
  })
}
