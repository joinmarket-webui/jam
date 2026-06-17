import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { useIsMobile } from './use-mobile'

describe('useIsMobile', () => {
  let innerWidthSpy: MockInstance<() => number>
  let matchMediaSpy: MockInstance<(query: string) => MediaQueryList>
  let mqlAddEventListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    innerWidthSpy = vi.spyOn(window, 'innerWidth', 'get')

    mqlAddEventListener = vi.fn()
    window.matchMedia = vi.fn()
    matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: mqlAddEventListener,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when window innerWidth is below breakpoint', () => {
    innerWidthSpy.mockReturnValue(500) // MOBILE_BREAKPOINT is 768
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when window innerWidth is at or above breakpoint', () => {
    innerWidthSpy.mockReturnValue(800)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates state when window resizes', () => {
    innerWidthSpy.mockReturnValue(800)
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
    expect(matchMediaSpy).toHaveBeenCalledWith('(max-width: 767px)')

    // Simulate resize event
    const resizeHandler = mqlAddEventListener.mock.calls[0][1] as () => void

    innerWidthSpy.mockReturnValue(500)

    act(() => {
      resizeHandler()
    })

    expect(result.current).toBe(true)
  })
})
