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

export const getErrorReason = (error: unknown, fallback: string): string => {
  const normalized = normalizeAppError(error)
  return toNonEmptyString(normalized.error_description) ?? toNonEmptyString(normalized.message) ?? fallback
}
