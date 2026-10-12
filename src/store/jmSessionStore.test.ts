import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { describe, expect, it } from 'vitest'
import { jmSessionStore } from './jmSessionStore'

describe('jmSessionStore', () => {
  it('stores the latest JoinMarket session response', () => {
    const session = { session: true } as unknown as SessionResponse
    const updatedAt = Date.now()

    expect(jmSessionStore.getState().state).toBeUndefined()

    jmSessionStore.getState().update(session, updatedAt)

    expect(jmSessionStore.getState().state).toEqual({
      ...session,
      __updatedAt: updatedAt,
    })
  })
})
