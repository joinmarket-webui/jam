import type { DirectSendRequest, DoCoinjoinRequest } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { satsPerVbyteToSatsPerKvbyte, TX_FEE_UNITS } from '@/lib/feeConfig'
import { isValidAddress, normalizeBitcoinAddress } from '@/lib/formValidation'
import { isValidInteger, isValidNumber } from '@/lib/utils'
import type { AmountValue, SendFormValues } from './types'

const ensureInteger = (value: unknown, message: string): number => {
  if (!isValidInteger(value)) {
    throw new TypeError(message)
  }
  return value
}

const txFeeValueForRequest = (data: SendFormValues): number | undefined => {
  if (data.txFee.txFeeUnit === TX_FEE_UNITS.BLOCKS && data.txFee.txFeeInBlocks !== undefined) {
    return data.txFee.txFeeInBlocks
  } else if (data.txFee.txFeeUnit === TX_FEE_UNITS.SATS_PER_VBYTE && data.txFee.txFeeInSatsPerVbyte !== undefined) {
    return satsPerVbyteToSatsPerKvbyte(data.txFee.txFeeInSatsPerVbyte)
  }
  return undefined
}

// Shared request validators: each builder passes its own message, so both builders
// apply the same rules and can't drift apart again (see #1630).
const requireSourceJarIndex = (data: SendFormValues, message: string): number => {
  const sourceJarIndex = ensureInteger(data.source?.fromJar, message)
  if (sourceJarIndex < 0) {
    throw new Error(message)
  }
  return sourceJarIndex
}

const requireAmountSats = (amount: AmountValue, message: string): number => {
  if (amount.isSweep) return 0
  const amountSats = ensureInteger(amount.amount, message)
  if (amountSats <= 0) {
    throw new Error(message)
  }
  return amountSats
}

const requireSweepUtxos = (amount: AmountValue, message: string): string[] | undefined => {
  if (!amount.isSweep) return undefined
  if (amount.sweepUtxos === undefined || amount.sweepUtxos.length === 0) {
    throw new Error(message)
  }
  return amount.sweepUtxos
}

const requireTxFee = (data: SendFormValues, message: string): number | undefined => {
  const txfee = txFeeValueForRequest(data)
  if (txfee !== undefined && (!isValidNumber(txfee) || txfee <= 0)) {
    throw new Error(message)
  }
  return txfee
}

const NON_COLLABORATIVE_ERROR_PREFIX = 'Cannot trigger non-collaborative transaction:'

export const buildNonCollaborativeSendRequest = (data: SendFormValues): DirectSendRequest => {
  if (data.amount === undefined) {
    throw new Error(`${NON_COLLABORATIVE_ERROR_PREFIX} Invalid amount given.`)
  }
  if (data.destination === undefined || !isValidAddress(data.destination.address)) {
    throw new Error(`${NON_COLLABORATIVE_ERROR_PREFIX} Invalid bitcoin address given.`)
  }
  const sourceJarIndex = requireSourceJarIndex(data, `${NON_COLLABORATIVE_ERROR_PREFIX} Invalid source jar given.`)
  if (data.amount.isSweep === true && data.amount.amount !== undefined) {
    throw new Error(`${NON_COLLABORATIVE_ERROR_PREFIX} Invalid amount given for sweep.`)
  }
  const inputUtxos = requireSweepUtxos(data.amount, `${NON_COLLABORATIVE_ERROR_PREFIX} Missing utxos to sweep.`)
  const amountSats = requireAmountSats(data.amount, `${NON_COLLABORATIVE_ERROR_PREFIX} Invalid amount given.`)
  const txfee = requireTxFee(data, `${NON_COLLABORATIVE_ERROR_PREFIX} Invalid transaction fee given.`)

  return {
    amount_sats: amountSats,
    destination: normalizeBitcoinAddress(data.destination.address),
    mixdepth: sourceJarIndex,
    txfee,
    input_utxos: inputUtxos,
  }
}

export const buildCollaborativeSendRequest = (data: SendFormValues): DoCoinjoinRequest => {
  const sourceJarIndex = requireSourceJarIndex(data, 'Invalid source jar.')

  const rawAddress: unknown = data.destination.address
  const address = typeof rawAddress === 'string' ? normalizeBitcoinAddress(rawAddress) : rawAddress
  if (!isValidAddress(address)) {
    throw new Error('Invalid bitcoin address.')
  }

  const counterparties = ensureInteger(data.numCollaborators, 'Invalid number of collaborators.')
  if (counterparties < 1) {
    throw new Error('Invalid number of collaborators.')
  }

  const amountSats = requireAmountSats(data.amount, 'Invalid amount.')
  const inputUtxos = requireSweepUtxos(data.amount, 'Missing utxos to sweep.')
  const txfee = requireTxFee(data, 'Invalid transaction fee.')

  return {
    mixdepth: sourceJarIndex,
    amount_sats: amountSats,
    counterparties,
    destination: address,
    txfee,
    input_utxos: inputUtxos,
  }
}
