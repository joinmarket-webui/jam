import { describe, expect, it } from 'vitest'
import { jarBadgeVariant } from './badge-variants'

describe('jarBadgeVariant', () => {
  it.each([
    [0, 'jar0'],
    [1, 'jar1'],
    [2, 'jar2'],
    [3, 'jar3'],
    [4, 'jar4'],
  ])('returns the jar badge variant for jar index %i', (jarIndex, variant) => {
    expect(jarBadgeVariant(jarIndex)).toBe(variant)
  })

  it('returns undefined when no jar is available', () => {
    expect(jarBadgeVariant()).toBeUndefined()
  })

  it('returns the unknown jar badge variant for non-standard jar indexes', () => {
    expect(jarBadgeVariant(5)).toBe('jarUnknown')
  })
})
