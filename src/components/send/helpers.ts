import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import { isDevMode } from '@/constants/debugFeatures'
import { JM_MINIMUM_MAKERS_DEFAULT } from '@/constants/jm'
import { isValidNumber } from '@/lib/utils'

export const MIN_NUM_COLLABORATORS = isDevMode() ? 1 : JM_MINIMUM_MAKERS_DEFAULT
export const MAX_NUM_COLLABORATORS = 99

export const isValidAddress = (value: unknown): value is string => {
  return typeof value === 'string' && isValidBitcoinAddress(value)
}

export const isValidAmount = (value: unknown, isSweepMode: boolean): value is number => {
  if (isSweepMode) {
    return value === 0
  }

  return isValidNumber(value) && Number.isInteger(value) && value > 0
}

export const isValidNumberOfCollaborators = (
  value: unknown,
  { min = MIN_NUM_COLLABORATORS, max = MAX_NUM_COLLABORATORS }: { min?: number; max?: number } = {},
): value is number => {
  return isValidNumber(value) && Number.isInteger(value) && value >= min && value <= max
}
