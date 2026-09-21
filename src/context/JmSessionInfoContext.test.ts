import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useJmSessionInfoContext } from './JmSessionInfoContext'

describe('useJmSessionInfoContext', () => {
  it('must be used inside a ContextProvider', () => {
    expect(() => renderHook(() => useJmSessionInfoContext())).toThrow(
      'useJmSessionInfoContext must be used within a JmSessionInfoContextProvider',
    )
  })
})
