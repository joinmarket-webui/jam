import { describe, expect, it } from 'vitest'
import {
  MAX_NUM_COLLABORATORS,
  MIN_NUM_COLLABORATORS,
  isValidAddress,
  isValidAmount,
  isValidNumberOfCollaborators,
} from './helpers'

const validRegtestAddress = 'bcrt1qrnz0thqslhxu86th069r9j6y7ldkgs2tzgf5wx'

describe('isValidAddress', () => {
  it('returns true for a valid bitcoin address', () => {
    expect(isValidAddress(validRegtestAddress)).toBe(true)
  })

  it('returns false for malformed address strings', () => {
    expect(isValidAddress('not-a-btc-address')).toBe(false)
    expect(isValidAddress('')).toBe(false)
  })

  it('returns false for non-string values', () => {
    expect(isValidAddress(null)).toBe(false)
    expect(isValidAddress(undefined)).toBe(false)
    expect(isValidAddress(Number.NaN)).toBe(false)
    expect(isValidAddress(12345)).toBe(false)
  })
})

describe('isValidAmount', () => {
  it('accepts positive integer amounts in normal mode', () => {
    expect(isValidAmount(1, false)).toBe(true)
    expect(isValidAmount(100_000, false)).toBe(true)
  })

  it('rejects non-positive and non-integer amounts in normal mode', () => {
    expect(isValidAmount(0, false)).toBe(false)
    expect(isValidAmount(-1, false)).toBe(false)
    expect(isValidAmount(1.25, false)).toBe(false)
  })

  it('rejects null, undefined, and NaN amounts', () => {
    expect(isValidAmount(null, false)).toBe(false)
    expect(isValidAmount(undefined, false)).toBe(false)
    expect(isValidAmount(Number.NaN, false)).toBe(false)
  })

  it('allows only zero in sweep mode', () => {
    expect(isValidAmount(0, true)).toBe(true)
    expect(isValidAmount(1, true)).toBe(false)
    expect(isValidAmount(-1, true)).toBe(false)
    expect(isValidAmount(Number.NaN, true)).toBe(false)
  })
})

describe('isValidNumCollaborators', () => {
  it('accepts values exactly at the default boundaries', () => {
    expect(isValidNumberOfCollaborators(MIN_NUM_COLLABORATORS)).toBe(true)
    expect(isValidNumberOfCollaborators(MAX_NUM_COLLABORATORS)).toBe(true)
  })

  it('rejects values outside default collaborator boundaries', () => {
    expect(isValidNumberOfCollaborators(MIN_NUM_COLLABORATORS - 1)).toBe(false)
    expect(isValidNumberOfCollaborators(MAX_NUM_COLLABORATORS + 1)).toBe(false)
  })

  it('rejects invalid collaborator values', () => {
    expect(isValidNumberOfCollaborators(null)).toBe(false)
    expect(isValidNumberOfCollaborators(undefined)).toBe(false)
    expect(isValidNumberOfCollaborators(Number.NaN)).toBe(false)
    expect(isValidNumberOfCollaborators(2.5)).toBe(false)
  })

  it('supports custom collaborator boundaries', () => {
    expect(isValidNumberOfCollaborators(2, { min: 2, max: 5 })).toBe(true)
    expect(isValidNumberOfCollaborators(5, { min: 2, max: 5 })).toBe(true)
    expect(isValidNumberOfCollaborators(1, { min: 2, max: 5 })).toBe(false)
    expect(isValidNumberOfCollaborators(6, { min: 2, max: 5 })).toBe(false)
  })
})
