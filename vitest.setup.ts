import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { expect, afterEach } from 'vitest'

// Node 24+ ships an experimental built-in `localStorage` that is disabled (and
// throws "invalid localStorage location") unless `--localstorage-file` is
// provided. When that global is active it shadows jsdom's implementation, which
// breaks persisted zustand stores in the unit tests. Install a simple in-memory
// Storage so `localStorage` always works in this environment.
const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value))
    },
  } as unknown as Storage
}

const memoryStorage = createMemoryStorage()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage })
if (globalThis.window !== undefined) {
  Object.defineProperty(globalThis.window, 'localStorage', { configurable: true, value: memoryStorage })
}

expect.extend(matchers)

afterEach(() => {
  cleanup()
})
