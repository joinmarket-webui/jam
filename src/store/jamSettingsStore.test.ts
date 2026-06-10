import { beforeEach, describe, expect, it } from 'vitest'
import { jamSettingsStore } from './jamSettingsStore'

describe('jamSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    jamSettingsStore.getState().clear()
  })

  it('should update display settings without replacing existing state', () => {
    jamSettingsStore.getState().update({ currencyUnit: 'btc', privateMode: true })

    expect(jamSettingsStore.getState().state).toMatchObject({
      addressChunking: true,
      currencyUnit: 'btc',
      privateMode: true,
    })
  })

  it('should reset display settings to their initial values', () => {
    jamSettingsStore.getState().update({ addressChunking: false, currencyUnit: 'btc', privateMode: true })
    jamSettingsStore.getState().clear()

    expect(jamSettingsStore.getState().state).toMatchObject({
      addressChunking: true,
      currencyUnit: 'sats',
      privateMode: false,
    })
  })
})
