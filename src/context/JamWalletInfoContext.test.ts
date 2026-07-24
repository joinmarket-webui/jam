import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useJamWalletInfoContext } from './JamWalletInfoContext'

describe('useJamWalletInfoContext', () => {
  it('must be used inside a ContextProvider', () => {
    expect(() => renderHook(() => useJamWalletInfoContext())).toThrow(
      'useJamWalletInfoContext must be used within a JamWalletInfoContextProvider',
    )
  })
})
