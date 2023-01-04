import { ServiceConfigContextEntry } from '../../context/ServiceConfigContext'
import { isValidNumber } from '../../utils'

export const initialNumCollaborators = (minValue: number) => {
  if (minValue > 8) {
    return minValue + pseudoRandomNumber(0, 2)
  }
  return pseudoRandomNumber(8, 10)
}

// not cryptographically random. returned number is in range [min, max] (both inclusive).
const pseudoRandomNumber = (min: number, max: number) => {
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
  return candidate !== null && isValidNumber(candidate) && candidate >= minNumCollaborators && candidate <= 99
}

export const enhanceDirectPaymentErrorMessageIfNecessary = async (
  httpStatus: number,
  errorMessage: string,
  onBadRequest: (errorMessage: string) => string
) => {
  const tryEnhanceMessage = httpStatus === 400
  if (tryEnhanceMessage) {
    return onBadRequest(errorMessage)
  }

  return errorMessage
}

export const enhanceTakerErrorMessageIfNecessary = async (
  loadConfigValue: ServiceConfigContextEntry['loadConfigValueIfAbsent'],
  httpStatus: number,
  errorMessage: string,
  onMaxFeeSettingsMissing: (errorMessage: string) => string
) => {
  const tryEnhanceMessage = httpStatus === 409
  if (tryEnhanceMessage) {
    const abortCtrl = new AbortController()

    const configExists = (section: string, field: string) =>
      loadConfigValue({
        signal: abortCtrl.signal,
        key: { section, field },
      })
        .then((val) => val.value !== null)
        .catch(() => false)

    const maxFeeSettingsPresent = await Promise.all([
      configExists('POLICY', 'max_cj_fee_rel'),
      configExists('POLICY', 'max_cj_fee_abs'),
    ])
      .then((arr) => arr.every((e) => e))
      .catch(() => false)

    if (!maxFeeSettingsPresent) {
      return onMaxFeeSettingsMissing(errorMessage)
    }
  }

  return errorMessage
}
