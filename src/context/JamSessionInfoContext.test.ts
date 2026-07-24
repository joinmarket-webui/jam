import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useJamSessionInfoContext } from './JamSessionInfoContext'

describe('useJamSessionInfoContext', () => {
  it('must be used inside a ContextProvider', () => {
    expect(() => renderHook(() => useJamSessionInfoContext())).toThrow(
      'useJamSessionInfoContext must be used within a JamSessionInfoContextProvider',
    )
  })
})
