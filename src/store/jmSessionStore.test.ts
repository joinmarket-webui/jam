import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { describe, expect, it } from 'vitest'
import { jmSessionStore } from './jmSessionStore'

describe('jmSessionStore', () => {
  it('stores the latest JoinMarket session response', () => {
    const session = { session: true } as unknown as SessionResponse

    expect(jmSessionStore.getState().state).toBeUndefined()

    jmSessionStore.getState().update(session)

    expect(jmSessionStore.getState().state).toBe(session)
  })
})
