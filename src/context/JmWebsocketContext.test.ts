import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useJmWebsocketContext } from './JmWebsocketContext'

describe('useJmWebsocketContext', () => {
  it('must be used inside a ContextProvider', () => {
    expect(() => renderHook(() => useJmWebsocketContext())).toThrow(
      'useJmWebsocketContext must be used within a JmWebsocketContextProvider',
    )
  })
})
