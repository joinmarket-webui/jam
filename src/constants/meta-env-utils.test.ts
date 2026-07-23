import { describe, it, expect } from 'vitest'
import { parseAsIntOrDefault } from './meta-env-utils'

describe('parseAsIntOrDefault', () => {
  it('should parse input as int or default', () => {
    expect(parseAsIntOrDefault(0, 21)).toBe(0)
    expect(parseAsIntOrDefault(-1, 21)).toBe(-1)
    expect(parseAsIntOrDefault(1, 21)).toBe(1)
    expect(parseAsIntOrDefault('-1', 21)).toBe(-1)
    expect(parseAsIntOrDefault('0', 21)).toBe(0)
    expect(parseAsIntOrDefault('1', 21)).toBe(1)
    expect(parseAsIntOrDefault('1.12231', 21)).toBe(1)
    expect(parseAsIntOrDefault(1.12231, 21)).toBe(1)
    expect(parseAsIntOrDefault(9.99999, 21)).toBe(9)
    expect(parseAsIntOrDefault(Number.MAX_VALUE /* '1.7976931348623157e+308' */, 21)).toBe(1)
    expect(parseAsIntOrDefault(Number.MIN_VALUE /* '5e-324' */, 21)).toBe(5)

    expect(parseAsIntOrDefault(undefined, 21)).toBe(21)
    expect(parseAsIntOrDefault('', 21)).toBe(21)
    expect(parseAsIntOrDefault(null, 21)).toBe(21)
    expect(parseAsIntOrDefault(String(Number.NaN), 21)).toBe(21)
    expect(parseAsIntOrDefault(Number.MAX_SAFE_INTEGER + 1, 21)).toBe(21)
    expect(parseAsIntOrDefault(Number.MIN_SAFE_INTEGER - 1, 21)).toBe(21)
  })
})
