import { describe, expect, it } from 'vitest'
import { toTakerStatusInfo } from './takerStatus'

describe('toTakerStatusInfo', () => {
  it('normalizes a missing status to undefined', () => {
    expect(toTakerStatusInfo(undefined).value).toBeUndefined()
    expect(toTakerStatusInfo({ running: false, status: null }).value).toBeUndefined()
  })

  it('maps known status values to flags', () => {
    expect(toTakerStatusInfo({ running: true, status: 'broadcasting' })).toMatchObject({
      value: 'broadcasting',
      broadcasting: true,
      completed: false,
    })
    expect(toTakerStatusInfo({ running: false, status: 'failed' })).toMatchObject({ failed: true, completed: false })
    expect(toTakerStatusInfo({ running: false, status: 'cancelled' })).toMatchObject({ cancelled: true })
  })

  it('distinguishes verified from unverified completions', () => {
    expect(toTakerStatusInfo({ running: false, status: 'complete', broadcast_method: 'self' })).toMatchObject({
      completed: true,
      completedUnverified: false,
    })
    expect(
      toTakerStatusInfo({ running: false, status: 'complete', broadcast_method: 'makers-unverified:random-peer' }),
    ).toMatchObject({
      completed: true,
      completedUnverified: true,
    })
  })

  it('marks completed, failed and cancelled runs as final', () => {
    expect(toTakerStatusInfo({ running: true, status: 'broadcasting' }).final).toBe(false)
    expect(toTakerStatusInfo({ running: true, status: 'complete' }).final).toBe(true)
    expect(toTakerStatusInfo({ running: false, status: 'failed' }).final).toBe(true)
    expect(toTakerStatusInfo({ running: false, status: 'cancelled' }).final).toBe(true)
  })
})
