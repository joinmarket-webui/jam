import React from 'react'
import { render } from '../testUtils'
import { act } from 'react-dom/test-utils'

import {
  COINJOIN_PRECONDITIONS,
  CoinjoinPreconditionSummary,
  useCoinjoinPreconditionSummary,
} from './CoinjoinPrecondition'
import { Utxos, Utxo } from '../context/WalletContext'

describe('useCoinjoinPreconditionSummary', () => {
  function setup(utxos: Utxos) {
    const returnVal: { data: CoinjoinPreconditionSummary | undefined } = { data: undefined }
    const TestComponent: React.FunctionComponent = () => {
      returnVal.data = useCoinjoinPreconditionSummary(utxos)
      return <></>
    }

    render(<TestComponent />)

    return returnVal
  }

  it('should NOT be fulfilled on empty (eligible) utxos', () => {
    let preconditionSummary: CoinjoinPreconditionSummary | undefined

    act(() => {
      preconditionSummary = setup([]).data
    })

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: COINJOIN_PRECONDITIONS.MIN_NUMBER_OF_UTXOS,
      amountOfMissingConfirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS,
      amountOfMissingOverallRetries: COINJOIN_PRECONDITIONS.MIN_OVERALL_REMAINING_RETRIES,
    })

    act(() => {
      preconditionSummary = setup([
        {
          frozen: true, // not eligible
          confirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS,
          tries_remaining: COINJOIN_PRECONDITIONS.MIN_OVERALL_REMAINING_RETRIES,
        } as Utxo,
      ]).data
    })

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: COINJOIN_PRECONDITIONS.MIN_NUMBER_OF_UTXOS,
      amountOfMissingConfirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS,
      amountOfMissingOverallRetries: COINJOIN_PRECONDITIONS.MIN_OVERALL_REMAINING_RETRIES,
    })
  })

  it('should be fulfilled on suitable utxos', () => {
    let preconditionSummary: CoinjoinPreconditionSummary | undefined

    act(() => {
      preconditionSummary = setup([
        {
          frozen: false,
          confirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS,
          tries_remaining: COINJOIN_PRECONDITIONS.MIN_OVERALL_REMAINING_RETRIES,
        } as Utxo,
        {
          frozen: true, // not eligible
          confirmations: 0,
          tries_remaining: 0,
        } as Utxo,
      ]).data
    })

    expect(preconditionSummary).toEqual({
      isFulfilled: true,
      numberOfMissingUtxos: 0,
      amountOfMissingConfirmations: 0,
      amountOfMissingOverallRetries: 0,
    })
  })

  it('should NOT be fulfilled on utxos with to little confirmations', () => {
    let preconditionSummary: CoinjoinPreconditionSummary | undefined

    act(() => {
      preconditionSummary = setup([
        {
          frozen: false,
          confirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS - 1,
          tries_remaining: COINJOIN_PRECONDITIONS.MIN_OVERALL_REMAINING_RETRIES,
        } as Utxo,
        {
          frozen: false,
          confirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS,
          tries_remaining: COINJOIN_PRECONDITIONS.MIN_OVERALL_REMAINING_RETRIES,
        } as Utxo,
        {
          frozen: true, // not eligible
          confirmations: 0,
          tries_remaining: 0,
        } as Utxo,
      ]).data
    })

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: 0,
      amountOfMissingConfirmations: 1,
      amountOfMissingOverallRetries: 0,
    })
  })

  it('should NOT be fulfilled on utxos with to little remaining retries', () => {
    let preconditionSummary: CoinjoinPreconditionSummary | undefined

    act(() => {
      preconditionSummary = setup([
        {
          frozen: false,
          confirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS,
          tries_remaining: COINJOIN_PRECONDITIONS.MIN_OVERALL_REMAINING_RETRIES - 1,
        } as Utxo,
        {
          frozen: false,
          confirmations: COINJOIN_PRECONDITIONS.MIN_CONFIRMATIONS,
          tries_remaining: 0,
        } as Utxo,
        {
          frozen: true, // not eligible
          confirmations: 0,
          tries_remaining: 0,
        } as Utxo,
      ]).data
    })

    expect(preconditionSummary).toEqual({
      isFulfilled: false,
      numberOfMissingUtxos: 0,
      amountOfMissingConfirmations: 0,
      amountOfMissingOverallRetries: 1,
    })
  })
})
