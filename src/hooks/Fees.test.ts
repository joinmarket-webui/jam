import { estimateMaxCollaboratorFee } from './Fees'

describe('estimateMaxCollaboratorFee', () => {
  it('should return estimate based on max fee', () => {
    const data = {
      amount: 100_000_000, // 1 btc
      maxFeeAbs: 21_000,
      maxFeeRel: 0.0002, // 0.02% = (20k sats)
    }

    expect(estimateMaxCollaboratorFee({ ...data, collaborators: -1 })).toBe(0)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 0 })).toBe(0)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 1 })).toBe(21_000)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 2 })).toBe(42_000)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 3 })).toBe(63_000)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 10 })).toBe(210_000)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 21_000 })).toBe(data.amount)
  })

  it('should return estimate based on rel fee', () => {
    const data = {
      amount: 100_000_000, // 1 btc
      maxFeeAbs: 9_001,
      maxFeeRel: 0.0001, // 0.01% = (10k sats)
    }

    expect(estimateMaxCollaboratorFee({ ...data, collaborators: -1 })).toBe(0)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 0 })).toBe(0)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 1 })).toBe(10_000)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 2 })).toBe(20_000)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 3 })).toBe(30_000)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 10 })).toBe(100_000)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 21_000 })).toBe(data.amount)
  })

  it('should return amount if max. fees are higher than amount', () => {
    const data = {
      amount: 21, // 21 sats
      maxFeeAbs: 22,
      maxFeeRel: 1, // 100%
    }

    expect(estimateMaxCollaboratorFee({ ...data, collaborators: -1 })).toBe(0)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 0 })).toBe(0)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 1 })).toBe(data.amount)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 2 })).toBe(data.amount)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 10 })).toBe(data.amount)
    expect(estimateMaxCollaboratorFee({ ...data, collaborators: 21_000 })).toBe(data.amount)
  })
})
