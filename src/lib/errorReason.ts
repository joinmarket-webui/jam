const toNonEmptyString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export interface AppError {
  message: string
  error_description?: string
}

export const normalizeAppError = (error: unknown): AppError => {
  const asString = toNonEmptyString(error)
  if (asString) {
    return { message: asString }
  }

  if (error instanceof Error) {
    return { message: error.message.trim() }
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { message?: unknown; error_description?: unknown }
    const message = toNonEmptyString(maybeError.message)
    const errorDescription = toNonEmptyString(maybeError.error_description)

    if (message && errorDescription) {
      return { message, error_description: errorDescription }
    }
    if (message) {
      return { message }
    }
    if (errorDescription) {
      return { message: errorDescription, error_description: errorDescription }
    }
  }

  return { message: '' }
}

const extractReason = (error: unknown, depth = 0): string | undefined => {
  if (depth > 4 || error === null || error === undefined) {
    return undefined
  }

  const directString = toNonEmptyString(error)
  if (directString) {
    return directString
  }

  if (typeof error !== 'object') {
    return undefined
  }

  const maybeError = error as {
    message?: unknown
    error_description?: unknown
    detail?: unknown
    statusText?: unknown
    title?: unknown
    error?: unknown
    response?: { data?: unknown } | unknown
    data?: unknown
    body?: unknown
    cause?: unknown
  }

  const prioritizedReason = [
    maybeError.error_description,
    maybeError.detail,
    maybeError.message,
    maybeError.statusText,
    maybeError.title,
  ]
    .map((value) => toNonEmptyString(value))
    .find(Boolean)

  if (prioritizedReason) {
    return prioritizedReason
  }

  const responseData =
    maybeError.response && typeof maybeError.response === 'object'
      ? (maybeError.response as { data?: unknown }).data
      : undefined

  const nestedCandidates = [
    maybeError.error,
    maybeError.response,
    responseData,
    maybeError.data,
    maybeError.body,
    maybeError.cause,
  ]

  for (const candidate of nestedCandidates) {
    const nestedReason = extractReason(candidate, depth + 1)
    if (nestedReason) {
      return nestedReason
    }
  }

  return undefined
}

export const getErrorReason = (error: unknown, fallback: string): string => {
  return extractReason(error) ?? fallback
}
