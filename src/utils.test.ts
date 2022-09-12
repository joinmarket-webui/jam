import { shortenStringMiddle } from './utils'

describe('shortenStringMiddle', () => {
  it('should shorten string in the middle', () => {
    expect(shortenStringMiddle('0')).toBe('0')
    expect(shortenStringMiddle('01')).toBe('01')
    expect(shortenStringMiddle('01', -1)).toBe('01')
    expect(shortenStringMiddle('01', 0)).toBe('01')
    expect(shortenStringMiddle('01', 1)).toBe('01')
    expect(shortenStringMiddle('01', 2)).toBe('01')
    expect(shortenStringMiddle('0123456789abcdef', 2)).toBe('0…f')
    expect(shortenStringMiddle('0123456789abcdef', 8)).toBe('0123…cdef')
    expect(shortenStringMiddle('0123456789abcdef', 8, '...')).toBe('0123...cdef')
    expect(shortenStringMiddle('0123456789abcdef', 14)).toBe('0123456…9abcdef')
    expect(shortenStringMiddle('0123456789abcdef', 15)).toBe('0123456…9abcdef')
    expect(shortenStringMiddle('0123456789abcdef', 16)).toBe('0123456789abcdef')
    expect(shortenStringMiddle('0123456789abcdef', 32)).toBe('0123456789abcdef')
  })
})
