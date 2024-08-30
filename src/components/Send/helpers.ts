import { isValidNumber } from '../../utils'

export const MAX_NUM_COLLABORATORS = 99

export const initialNumCollaborators = (minValue: number): number => {
  if (minValue > 8) {
    return minValue + pseudoRandomNumber(0, 2)
  }

  return pseudoRandomNumber(8, 10)
}

// not cryptographically random. returned number is in range [min, max] (both inclusive).
export const pseudoRandomNumber = (min: number, max: number) => {
  return Math.round(Math.random() * (max - min)) + min
}

export const isValidAddress = (candidate: string | null) => {
  return typeof candidate === 'string' && !(candidate === '')
}

export const isValidJarIndex = (candidate: number) => {
  return isValidNumber(candidate) && candidate >= 0
}

export const isValidAmount = (candidate: number | null, isSweep: boolean) => {
  return candidate !== null && isValidNumber(candidate) && (isSweep ? candidate === 0 : candidate > 0)
}

export const isValidNumCollaborators = (candidate: number | null, minNumCollaborators: number) => {
  return (
    candidate !== null &&
    isValidNumber(candidate) &&
    candidate >= minNumCollaborators &&
    candidate <= MAX_NUM_COLLABORATORS
  )
}
