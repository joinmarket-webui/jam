import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DevErrorThrowingComponent from './DevErrorThrowingComponent'

describe('DevErrorThrowingComponent', () => {
  it('throws an error on mount', () => {
    // Prevent React from logging the error to console during the test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<DevErrorThrowingComponent />)
    }).toThrow('This error is thrown on purpose. Only to be used for testing.')

    consoleSpy.mockRestore()
  })
})
