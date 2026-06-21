import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { useCheatsheet } from './useCheatsheet'

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  pseudoRandomFloat: vi.fn(() => 45),
}))

describe('useCheatsheet', () => {
  beforeEach(() => {
    localStorage.clear()
    jamSettingsStore.getState().clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens by default and schedules the next display time when changed', async () => {
    const { result } = renderHook(() => useCheatsheet())

    expect(result.current.open).toBe(true)

    act(() => result.current.onOpenChange(false))
    expect(result.current.open).toBe(false)

    await act(() => vi.advanceTimersByTime(4))

    expect(jamSettingsStore.getState().state.cheatsheetForceOpenAt).toBe(
      Date.UTC(2026, 0, 1) + 4 + 45 * 24 * 60 * 60 * 1000,
    )
  })
})
