const nonEmptyString = <T>(value: unknown, fallback: T): string | T => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed !== '' ? trimmed : fallback
}

const nonEmptyStringOrUndefined = (value: unknown) => {
  return nonEmptyString(value, undefined)
}

const formatFastApiValidationLocation = (loc: unknown): string | undefined => {
  if (!Array.isArray(loc)) return undefined

  return nonEmptyStringOrUndefined(
    loc
      .filter((part) => part !== 'body' && part !== 'query')
      .map(String)
      .join('.'),
  )
}

const formatFastApiValidationError = (error: unknown): string | undefined => {
  if (typeof error === 'string') {
    return nonEmptyStringOrUndefined(error)
  }

  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  const validationError = error as { loc?: unknown; msg?: unknown }
  const message = nonEmptyStringOrUndefined(validationError.msg)
  if (!message) {
    return undefined
  }

  const location = formatFastApiValidationLocation(validationError.loc)
  return location ? `${location}: ${message}` : message
}

const formatFastApiDetail = (detail: unknown): string | undefined => {
  if (typeof detail === 'string') {
    return nonEmptyStringOrUndefined(detail)
  }

  if (!Array.isArray(detail)) {
    return undefined
  }

  const parts = detail
    .map((error) => formatFastApiValidationError(error))
    .filter((part): part is string => part !== undefined)
  return parts.length > 0 ? parts.join(', ') : undefined
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
    const maybeError = error as { message?: unknown; error_description?: unknown; detail?: unknown }
    error_message = nonEmptyStringOrUndefined(maybeError.message)
    error_description =
      nonEmptyStringOrUndefined(maybeError.error_description) ?? formatFastApiDetail(maybeError.detail)
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
