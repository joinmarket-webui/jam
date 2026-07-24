import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useJamDisplayContext } from './JamDisplayContext'

describe('useJamDisplayContext', () => {
  it('must be used inside a ContextProvider', () => {
    expect(() => renderHook(() => useJamDisplayContext())).toThrow(
      'useJamDisplayContext must be used within a JamDisplayContextProvider',
    )
  })
})
