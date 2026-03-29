const nonEmptyString = <T>(value: unknown, fallback: T): string | T => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed !== '' ? trimmed : fallback
}

const nonEmptyStringOrUndefined = (value: unknown) => {
  return nonEmptyString(value, undefined)
}

export interface AppError {
  message: string
  error_message?: string
  error_description?: string
  context: unknown
}

const UNKNOWN_ERROR_MESSAGE = 'Unknown error'

export const normalizeAppError = (error: unknown): AppError => {
  let error_message
  let error_description

  if (typeof error === 'string') {
    error_message = error.trim()
  } else if (error instanceof Error) {
    error_message = error.message.trim()
  } else if (typeof error === 'object' && error !== null) {
    const maybeError = error as { message?: unknown; error_description?: unknown }
    error_message = nonEmptyStringOrUndefined(maybeError.message)
    error_description = nonEmptyStringOrUndefined(maybeError.error_description)
  }

  return {
    message: error_message || error_description || UNKNOWN_ERROR_MESSAGE,
    error_message,
    error_description,
    context: error,
  }
}

export const getErrorReason = (error: unknown, fallback: string): string => {
  const appError = normalizeAppError(error)
  return nonEmptyString(appError.error_description || appError.error_message, fallback)
}
