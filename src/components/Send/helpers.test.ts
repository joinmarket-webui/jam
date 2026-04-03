import { MAX_NUM_COLLABORATORS, isValidAddress, isValidAmount, isValidNumCollaborators } from './helpers'

describe('Send helpers', () => {
  describe('isValidAddress', () => {
    it('accepts a non-empty address string', () => {
      expect(isValidAddress('bc1qexampleaddress')).toBe(true)
    })

    it('rejects null and empty strings', () => {
      expect(isValidAddress(null)).toBe(false)
      expect(isValidAddress('')).toBe(false)
    })
  })

  describe('isValidAmount', () => {
    it('accepts positive amounts in normal mode', () => {
      expect(isValidAmount(1, false)).toBe(true)
      expect(isValidAmount(100_000, false)).toBe(true)
    })

    it('accepts only zero in sweep mode', () => {
      expect(isValidAmount(0, true)).toBe(true)
      expect(isValidAmount(1, true)).toBe(false)
      expect(isValidAmount(-1, true)).toBe(false)
    })

    it('rejects null, NaN, and non-positive values', () => {
      expect(isValidAmount(null, false)).toBe(false)
      expect(isValidAmount(NaN, false)).toBe(false)
      expect(isValidAmount(0, false)).toBe(false)
      expect(isValidAmount(-1, false)).toBe(false)
    })
  })

  describe('isValidNumCollaborators', () => {
    it('accepts values within the configured boundaries', () => {
      expect(isValidNumCollaborators(2, 2)).toBe(true)
      expect(isValidNumCollaborators(MAX_NUM_COLLABORATORS, 2)).toBe(true)
    })

    it('rejects values below the minimum, above the maximum, null, and NaN', () => {
      expect(isValidNumCollaborators(1, 2)).toBe(false)
      expect(isValidNumCollaborators(MAX_NUM_COLLABORATORS + 1, 2)).toBe(false)
      expect(isValidNumCollaborators(null, 2)).toBe(false)
      expect(isValidNumCollaborators(NaN, 2)).toBe(false)
    })
  })
})
