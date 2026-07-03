import { describe, expect, it } from 'vitest'
import { getJarBgClass } from './jarColors'

describe('getJarBgClass', () => {
  it.each([
    [0, 'bg-jar0'],
    [1, 'bg-jar1'],
    [2, 'bg-jar2'],
    [3, 'bg-jar3'],
    [4, 'bg-jar4'],
  ])('returns the jar background class for jar index %i', (jarIndex, className) => {
    expect(getJarBgClass(jarIndex)).toBe(className)
  })

  it('returns undefined when no jar is available', () => {
    expect(getJarBgClass()).toBeUndefined()
  })

  it('returns the unknown jar background class for non-standard jar indexes', () => {
    expect(getJarBgClass(5)).toBe('bg-jar-unknown')
  })
})
