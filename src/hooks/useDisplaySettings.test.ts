import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { useDisplaySettings } from './useDisplaySettings'

describe('useDisplaySettings', () => {
  beforeEach(() => {
    localStorage.clear()
    jamSettingsStore.getState().clear()
  })

  it('should expose default display settings', () => {
    const { result } = renderHook(() => useDisplaySettings())

    expect(result.current.currency).toBe('sats')
    expect(result.current.isPrivate).toBe(false)
    expect(result.current.addressChunkingEnabled).toBe(true)
  })

  it('should toggle individual display settings', () => {
    const { result } = renderHook(() => useDisplaySettings())

    act(() => result.current.toggleCurrencyUnit())
    expect(result.current.currency).toBe('btc')

    act(() => result.current.togglePrivacyMode())
    expect(result.current.isPrivate).toBe(true)

    act(() => result.current.toggleAddressChunking())
    expect(result.current.addressChunkingEnabled).toBe(false)
  })

  it('should cycle through sats, btc, and private display modes', () => {
    const { result } = renderHook(() => useDisplaySettings())

    act(() => result.current.toggleDisplayMode())
    expect(result.current.currency).toBe('btc')
    expect(result.current.isPrivate).toBe(false)

    act(() => result.current.toggleDisplayMode())
    expect(result.current.currency).toBe('btc')
    expect(result.current.isPrivate).toBe(true)

    act(() => result.current.toggleDisplayMode())
    expect(result.current.currency).toBe('sats')
    expect(result.current.isPrivate).toBe(false)
  })
})
