import { afterEach, describe, expect, it, vi } from 'vitest'
import { claimPreloadReload } from './preloadRecovery'

describe('claimPreloadReload', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.sessionStorage.clear()
  })

  it('allows one reload for the same build even after the handler is recreated', async () => {
    expect(claimPreloadReload('/assets/index-old.js')).toBe(true)
    vi.resetModules()
    const reloaded = await import('./preloadRecovery')
    expect(reloaded.claimPreloadReload('/assets/index-old.js')).toBe(false)
    expect(reloaded.claimPreloadReload('/assets/index-new.js')).toBe(true)
  })

  it('does not reload when the guard cannot be stored', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'QuotaExceededError')
    })
    expect(claimPreloadReload('/assets/index-old.js')).toBe(false)
  })
})
