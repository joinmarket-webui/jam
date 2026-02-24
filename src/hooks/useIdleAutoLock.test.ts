import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createIdleTracker } from './useIdleAutoLock'

function createMockWindow() {
  const listeners = new Map<string, Set<EventListener>>()
  const addSpy = vi.fn((event: string, handler: EventListener) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(handler)
  })
  const removeSpy = vi.fn((event: string, handler: EventListener) => {
    listeners.get(event)?.delete(handler)
  })
  const win = {
    addEventListener: addSpy,
    removeEventListener: removeSpy,
    dispatch(event: string) {
      listeners.get(event)?.forEach((handler) => handler(new Event(event)))
    },
  } as unknown as Window & { dispatch: (event: string) => void }
  return { win, addSpy, removeSpy }
}

describe('createIdleTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires callback after timeout period of inactivity', () => {
    const onLock = vi.fn()
    const { win } = createMockWindow()
    const tracker = createIdleTracker(onLock, 5 * 60 * 1_000, win)
    tracker.start()

    vi.advanceTimersByTime(4 * 60 * 1_000)
    expect(onLock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1 * 60 * 1_000)
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('resets timer on user activity', () => {
    const onLock = vi.fn()
    const { win } = createMockWindow()
    const tracker = createIdleTracker(onLock, 5 * 60 * 1_000, win)
    tracker.start()

    // Advance 4 minutes
    vi.advanceTimersByTime(4 * 60 * 1_000)
    expect(onLock).not.toHaveBeenCalled()

    // Simulate mouse activity
    win.dispatch('mousemove')

    // 4 more minutes from activity (would be 8 total, but timer restarted)
    vi.advanceTimersByTime(4 * 60 * 1_000)
    expect(onLock).not.toHaveBeenCalled()

    // 1 more minute → 5 since last activity
    vi.advanceTimersByTime(1 * 60 * 1_000)
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('cleans up timers and listeners on stop', () => {
    const onLock = vi.fn()
    const { win, removeSpy } = createMockWindow()
    const tracker = createIdleTracker(onLock, 5 * 60 * 1_000, win)
    tracker.start()

    tracker.stop()
    expect(removeSpy).toHaveBeenCalled()

    vi.advanceTimersByTime(10 * 60 * 1_000)
    expect(onLock).not.toHaveBeenCalled()
  })

  it('resets on keyboard activity', () => {
    const onLock = vi.fn()
    const { win } = createMockWindow()
    const tracker = createIdleTracker(onLock, 1 * 60 * 1_000, win)
    tracker.start()

    vi.advanceTimersByTime(50_000)
    win.dispatch('keydown')

    vi.advanceTimersByTime(50_000)
    expect(onLock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(10_000)
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('registers listeners for all activity events', () => {
    const onLock = vi.fn()
    const { win, addSpy } = createMockWindow()
    const tracker = createIdleTracker(onLock, 60_000, win)
    tracker.start()

    const calls = addSpy.mock.calls.map((c) => c[0])
    expect(calls).toContain('mousemove')
    expect(calls).toContain('mousedown')
    expect(calls).toContain('keydown')
    expect(calls).toContain('touchstart')
    expect(calls).toContain('scroll')
  })
})
