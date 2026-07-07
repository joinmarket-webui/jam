import { describe, expect, it } from 'vitest'
import { getJarBadgeVariant } from './badge-variants'

describe('getJarBadgeVariant', () => {
  it.each([
    [0, 'jar0'],
    [1, 'jar1'],
    [2, 'jar2'],
    [3, 'jar3'],
    [4, 'jar4'],
  ])('returns the jar badge variant for jar index %i', (jarIndex, variant) => {
    expect(getJarBadgeVariant(jarIndex)).toBe(variant)
  })

  it('returns undefined when no jar is available', () => {
    expect(getJarBadgeVariant()).toBeUndefined()
  })

  it('returns the unknown jar badge variant for non-standard jar indexes', () => {
    expect(getJarBadgeVariant(5)).toBe('jarUnknown')
  })
})
