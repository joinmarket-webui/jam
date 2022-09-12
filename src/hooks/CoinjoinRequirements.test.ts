import { DEFAULT_REQUIREMENT_OPTIONS, buildCoinjoinRequirementSummary } from './CoinjoinRequirements'
import { Utxo } from '../context/WalletContext'

describe('CoinjoinRequirements', () => {
  const defaultOptions = DEFAULT_REQUIREMENT_OPTIONS

  it('should NOT be fulfilled on empty utxos', () => {
    const preconditionSummary = buildCoinjoinRequirementSummary([])

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: DEFAULT_REQUIREMENT_OPTIONS.minNumberOfUtxos,
      numberOfMissingConfirmations: 0,
      options: defaultOptions,
      violations: [],
    })
  })

  it('should NOT be fulfilled on missing eligible utxos (e.g. all frozen)', () => {
    const preconditionSummary = buildCoinjoinRequirementSummary([
      {
        frozen: true, // not eligible
        confirmations: DEFAULT_REQUIREMENT_OPTIONS.minConfirmations,
        tries_remaining: 3,
      } as Utxo,
    ])

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: 1,
      numberOfMissingConfirmations: 0,
      options: defaultOptions,
      violations: [],
    })
  })

  it('should be fulfilled on suitable utxos', () => {
    const preconditionSummary = buildCoinjoinRequirementSummary([
      {
        frozen: false,
        confirmations: DEFAULT_REQUIREMENT_OPTIONS.minConfirmations,
        tries_remaining: 1,
      } as Utxo,
      {
        frozen: true, // not eligible
        confirmations: 0,
        tries_remaining: 0,
      } as Utxo,
    ])

    expect(preconditionSummary).toEqual({
      isFulfilled: true,
      numberOfMissingUtxos: 0,
      numberOfMissingConfirmations: 0,
      options: defaultOptions,
      violations: [],
    })
  })

  it('should NOT be fulfilled on utxos with to little confirmations', () => {
    let preconditionSummary = buildCoinjoinRequirementSummary([
      {
        frozen: false,
        confirmations: DEFAULT_REQUIREMENT_OPTIONS.minConfirmations - 1,
        tries_remaining: 1,
        mixdepth: 0,
      } as Utxo,
      {
        frozen: false,
        confirmations: DEFAULT_REQUIREMENT_OPTIONS.minConfirmations,
        tries_remaining: 1,
        mixdepth: 0,
      } as Utxo,
      {
        frozen: true, // not eligible
        confirmations: 0,
        tries_remaining: 0,
        mixdepth: 0,
      } as Utxo,
    ])

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: 0,
      numberOfMissingConfirmations: 1,
      options: defaultOptions,
      violations: [
        {
          hasViolations: true,
          jarIndex: 0,
          utxosViolatingMinConfirmations: [
            {
              confirmations: DEFAULT_REQUIREMENT_OPTIONS.minConfirmations - 1,
              frozen: false,
              tries_remaining: 1,
              mixdepth: 0,
            },
          ],
          utxosViolatingRetriesLeft: [],
        },
      ],
    })
  })

  it('should NOT be fulfilled on utxos with to little remaining retries', () => {
    let preconditionSummary = buildCoinjoinRequirementSummary([
      {
        frozen: false,
        confirmations: DEFAULT_REQUIREMENT_OPTIONS.minConfirmations,
        tries_remaining: 0,
        mixdepth: 0,
      } as Utxo,
      {
        frozen: false,
        confirmations: DEFAULT_REQUIREMENT_OPTIONS.minConfirmations,
        tries_remaining: 0,
        mixdepth: 0,
      } as Utxo,
      {
        frozen: true, // not eligible
        confirmations: 0,
        tries_remaining: 0,
        mixdepth: 0,
      } as Utxo,
    ])

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: 0,
      numberOfMissingConfirmations: 0,
      options: defaultOptions,
      violations: [
        {
          hasViolations: true,
          jarIndex: 0,
          utxosViolatingMinConfirmations: [],
          utxosViolatingRetriesLeft: [
            {
              confirmations: 5,
              frozen: false,
              tries_remaining: 0,
              mixdepth: 0,
            },
            {
              confirmations: 5,
              frozen: false,
              tries_remaining: 0,
              mixdepth: 0,
            },
          ],
        },
      ],
    })
  })

  it('should return used options in result summary', () => {
    const customConfig = {
      minNumberOfUtxos: 42,
      minConfirmations: 1337,
    }
    const preconditionSummary = buildCoinjoinRequirementSummary([], customConfig)

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: customConfig.minNumberOfUtxos,
      numberOfMissingConfirmations: 0,
      options: customConfig,
      violations: [],
    })
  })
})
