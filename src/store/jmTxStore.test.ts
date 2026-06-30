import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { JmTxInfo } from './jmTxStore'
import { jmTxStore } from './jmTxStore'

const tx = (txid: string) => ({ txid }) as JmTxInfo

describe('jmTxStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jmTxStore.getState().clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  it('adds, updates, and clears tracked transactions', () => {
    jmTxStore.getState().add(tx('abc'))

    expect(jmTxStore.getState().get('abc')).toEqual(tx('abc'))
    expect(jmTxStore.getState().get('missing')).toBeUndefined()
    expect(jmTxStore.getState().getAll().abc.insertedAt).toBe(Date.UTC(2026, 0, 1))

    vi.setSystemTime(new Date('2026-01-02T00:00:00Z'))
    jmTxStore.getState().add({ ...tx('abc'), outs: [] } as JmTxInfo)

    expect(jmTxStore.getState().getAll().abc.insertedAt).toBe(Date.UTC(2026, 0, 1))
    expect(jmTxStore.getState().getAll().abc.updatedAt).toBe(Date.UTC(2026, 0, 2))

    jmTxStore.getState().clear()
    expect(jmTxStore.getState().getAll()).toEqual({})
  })
})
