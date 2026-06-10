import { beforeEach, describe, expect, it } from 'vitest'
import type { ConfigKey } from '@/constants/jm'
import { jmConfigStore } from './jmConfigStore'

const txFeesKey: ConfigKey = { section: 'POLICY', field: 'tx_fees' }
const maxFeeKey: ConfigKey = { section: 'POLICY', field: 'max_cj_fee_abs' }

describe('jmConfigStore', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jmConfigStore.getState().clear()
  })

  it('returns null for missing config values', () => {
    expect(jmConfigStore.getState().get(txFeesKey)).toBeNull()
  })

  it('stores values by config section and field', () => {
    jmConfigStore.getState().set({ key: txFeesKey, value: '3' })
    jmConfigStore.getState().set({ key: maxFeeKey, value: '1500' })

    expect(jmConfigStore.getState().get(txFeesKey)).toEqual({ key: txFeesKey, value: '3' })
    expect(jmConfigStore.getState().get(maxFeeKey)).toEqual({ key: maxFeeKey, value: '1500' })
    expect(jmConfigStore.getState().state).toEqual({
      POLICY: {
        tx_fees: '3',
        max_cj_fee_abs: '1500',
      },
    })
  })

  it('clears stored config values', () => {
    jmConfigStore.getState().set({ key: txFeesKey, value: '3' })
    jmConfigStore.getState().clear()

    expect(jmConfigStore.getState().state).toEqual({})
    expect(jmConfigStore.getState().get(txFeesKey)).toBeNull()
  })
})
