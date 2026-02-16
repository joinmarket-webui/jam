const toNonEmptyString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
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
