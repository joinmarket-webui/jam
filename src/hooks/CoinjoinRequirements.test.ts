import { Utxo } from '../libs/JmWalletApi'
import { DEFAULT_REQUIREMENT_OPTIONS, buildCoinjoinRequirementSummary } from './CoinjoinRequirements'

describe('CoinjoinRequirements', () => {
  const defaultOptions = DEFAULT_REQUIREMENT_OPTIONS

  it('should NOT be fulfilled on empty utxos', () => {
    const preconditionSummary = buildCoinjoinRequirementSummary([])

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: defaultOptions.minNumberOfUtxos,
      numberOfMissingConfirmations: 0,
      options: defaultOptions,
      violations: [],
    })
  })

  it('should NOT be fulfilled on missing eligible utxos (e.g. all frozen)', () => {
    const preconditionSummary = buildCoinjoinRequirementSummary([
      {
        frozen: true, // not eligible
        confirmations: defaultOptions.minConfirmations,
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
        confirmations: defaultOptions.minConfirmations,
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

  it('should NOT be fulfilled on utxos with too little confirmations', () => {
    let preconditionSummary = buildCoinjoinRequirementSummary([
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations - 1,
        tries_remaining: 1,
        mixdepth: 0,
      } as Utxo,
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations,
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
              confirmations: defaultOptions.minConfirmations - 1,
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

  it('should NOT be fulfilled on utxos without remaining retries', () => {
    let preconditionSummary = buildCoinjoinRequirementSummary([
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations,
        tries_remaining: 0, // no retry
        mixdepth: 0,
      } as Utxo,
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations,
        tries_remaining: 0, // no retry
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
  it('should be fulfilled if at least one utxo has retries left in a jar', () => {
    let preconditionSummary = buildCoinjoinRequirementSummary([
      // 3 utxos in mixdepth 0
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations,
        tries_remaining: 0, // no retry
        mixdepth: 0,
      } as Utxo,
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations,
        tries_remaining: 0, // no retry
        mixdepth: 0,
      } as Utxo,
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations,
        tries_remaining: 1,
        mixdepth: 0,
      } as Utxo,
      // 2 utxos in mixdepth 4
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations,
        tries_remaining: 0, // no retry
        mixdepth: 4,
      } as Utxo,
      {
        frozen: false,
        confirmations: defaultOptions.minConfirmations,
        tries_remaining: 1,
        mixdepth: 4,
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
