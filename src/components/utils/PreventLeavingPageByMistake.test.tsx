import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PreventLeavingPageByMistake from './PreventLeavingPageByMistake'

describe('PreventLeavingPageByMistake', () => {
  it('adds and removes beforeunload event listener', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const abortCtrlSpy = vi.spyOn(AbortController.prototype, 'abort')

    const { unmount } = render(<PreventLeavingPageByMistake />)

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) as unknown }),
    )

    // Simulate beforeunload event
    const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'beforeunload')?.[1] as EventListener
    const preventDefaultSpy = vi.fn()
    const mockEvent = { preventDefault: preventDefaultSpy, returnValue: undefined }

    const result = handler(mockEvent as unknown as Event)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(mockEvent.returnValue).toBe('')
    expect(result).toBe('')

    unmount()

    expect(abortCtrlSpy).toHaveBeenCalled()

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
    abortCtrlSpy.mockRestore()
  })
})
