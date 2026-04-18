import { isValidAddress, isValidAmount, isValidNumCollaborators, MAX_NUM_COLLABORATORS } from './helpers'

describe('isValidAddress', () => {
  it('returns true for a non-empty string', () => {
    expect(isValidAddress('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isValidAddress('')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidAddress(null)).toBe(false)
  })
})

describe('isValidAmount', () => {
  it('returns true for positive amount when not sweep', () => {
    expect(isValidAmount(100_000, false)).toBe(true)
  })

  it('returns true for zero in sweep mode', () => {
    expect(isValidAmount(0, true)).toBe(true)
  })

  it('returns false for zero when not sweep', () => {
    expect(isValidAmount(0, false)).toBe(false)
  })

  it('returns false for negative amount', () => {
    expect(isValidAmount(-1, false)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidAmount(null, false)).toBe(false)
  })

  it('returns false for NaN', () => {
    expect(isValidAmount(NaN, false)).toBe(false)
  })

  it('returns false for positive amount in sweep mode', () => {
    expect(isValidAmount(100_000, true)).toBe(false)
  })

  it('returns false for NaN in sweep mode', () => {
    expect(isValidAmount(NaN, true)).toBe(false)
  })
})

describe('isValidNumCollaborators', () => {
  it('returns true at lower boundary (minValue)', () => {
    expect(isValidNumCollaborators(3, 3)).toBe(true)
  })

  it('returns true at upper boundary (MAX_NUM_COLLABORATORS)', () => {
    expect(isValidNumCollaborators(MAX_NUM_COLLABORATORS, 1)).toBe(true)
  })

  it('returns false one below minValue', () => {
    expect(isValidNumCollaborators(2, 3)).toBe(false)
  })

  it('returns false one above MAX_NUM_COLLABORATORS', () => {
    expect(isValidNumCollaborators(100, 1)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isValidNumCollaborators(null, 1)).toBe(false)
  })

  it('returns false for NaN', () => {
    expect(isValidNumCollaborators(NaN, 1)).toBe(false)
  })
})
