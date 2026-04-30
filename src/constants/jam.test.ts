import { describe, it, expect } from 'vitest'
import { TOTAL_COIN_SUPPLY } from './jam'

describe('TOTAL_COIN_SUPPLY', () => {
  it('should have exact total coin supply as constant', () => {
    expect(TOTAL_COIN_SUPPLY).toBe(2099999997690000)
  })
})
