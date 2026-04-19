import type { DirectSendRequest, DoCoinjoinRequest } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import { txFeeUnit } from '@/constants/jm'
import { isValidNumber } from '@/lib/utils'
import type { SendFormValues } from './types'

const ensureInteger = (value: unknown, message: string): number => {
  if (!isValidNumber(value) || !Number.isSafeInteger(value)) {
    throw new TypeError(message)
  }
  return value
}

const txFeeValueForRequest = (data: SendFormValues): number | undefined => {
  if (data.txFeeUnit === txFeeUnit.BLOCKS && data.txFeeInBlocks !== undefined) {
    return data.txFeeInBlocks
  } else if (data.txFeeUnit === txFeeUnit.SATS_PER_KILO_VBYTE && data.txFeeInSatsPerVbyte !== undefined) {
    return Math.ceil(data.txFeeInSatsPerVbyte * 1_000)
  }
  return undefined
}

export const buildNonCollaborativeSendRequest = (data: SendFormValues): DirectSendRequest => {
  if (data.amount === undefined) {
    throw new Error('Cannot trigger non-collaborative transaction: Invalid amount given.')
  }
  if (data.destination === undefined || !isValidBitcoinAddress(data.destination.address)) {
    throw new Error('Cannot trigger non-collaborative transaction: Invalid bitcoin address given.')
  }
  if (data.source?.fromJar === undefined) {
    throw new Error('Cannot trigger non-collaborative transaction: Invalid source jar given.')
  }
  if (data.amount.isSweep === true && data.amount.amount !== undefined) {
    throw new Error('Cannot trigger non-collaborative transaction: Invalid amount given for sweep.')
  }

  const txfee = txFeeValueForRequest(data)

  return {
    amount_sats: data.amount.isSweep === true ? 0 : data.amount.amount,
    destination: data.destination.address,
    mixdepth: data.source.fromJar,
    txfee,
  }
}

export const buildCollaborativeSendRequest = (data: SendFormValues): DoCoinjoinRequest => {
  const sourceJarIndex = ensureInteger(data.source?.fromJar, 'Invalid source jar.')
  if (sourceJarIndex < 0) {
    throw new Error('Invalid source jar.')
  }

  const address = data.destination.address
  if (typeof address !== 'string' || !isValidBitcoinAddress(address)) {
    throw new Error('Invalid bitcoin address.')
  }

  const counterparties = ensureInteger(data.numCollaborators, 'Invalid number of collaborators.')
  if (counterparties < 1) {
    throw new Error('Invalid number of collaborators.')
  }

  const amountSats = data.amount.isSweep ? 0 : ensureInteger(data.amount.amount, 'Invalid amount.')
  if (!data.amount.isSweep && amountSats <= 0) {
    throw new Error('Invalid amount.')
  }

  const txfee = txFeeValueForRequest(data)
  if (txfee !== undefined && (!isValidNumber(txfee) || txfee <= 0)) {
    throw new Error('Invalid transaction fee.')
  }

  return {
    mixdepth: sourceJarIndex,
    amount_sats: amountSats,
    counterparties,
    destination: address,
    txfee,
  }
}
