import type { DoCoinjoinRequest } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import type { SendFormValues } from './types'

const ensureInteger = (value: unknown, message: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(message)
  }
  return value
}

export const buildCollaborativeSendRequest = (data: SendFormValues): DoCoinjoinRequest => {
  const sourceJarIndex = ensureInteger(data.source?.fromJar, 'Invalid source jar.')
  if (sourceJarIndex < 0) {
    throw new Error('Invalid source jar.')
  }

  const address = data.destination?.address
  if (typeof address !== 'string' || !isValidBitcoinAddress(address)) {
    throw new Error('Invalid bitcoin address.')
  }

  const counterparties = ensureInteger(data.numCollaborators, 'Invalid number of collaborators.')
  if (counterparties < 1) {
    throw new Error('Invalid number of collaborators.')
  }

  const amountSats = data.amount?.isSweep ? 0 : data.amount?.amount
  if (!data.amount?.isSweep) {
    const amount = ensureInteger(amountSats, 'Invalid amount.')
    if (amount <= 0) {
      throw new Error('Invalid amount.')
    }
  }

  const txfee = data.txFee?.value
  if (txfee !== undefined && (typeof txfee !== 'number' || Number.isNaN(txfee) || txfee <= 0)) {
    throw new Error('Invalid transaction fee.')
  }

  return {
    mixdepth: sourceJarIndex,
    amount_sats: amountSats ?? 0,
    counterparties,
    destination: address,
    ...(txfee !== undefined ? { txfee } : {}),
  }
}
