export const getErrorReason = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error.trim()) return error

  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: unknown
      error_description?: unknown
      detail?: unknown
    }
    if (typeof maybeError.error_description === 'string' && maybeError.error_description.trim()) {
      return maybeError.error_description
    }
    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message
    }
    if (typeof maybeError.detail === 'string' && maybeError.detail.trim()) {
      return maybeError.detail
    }
  }

  return fallback
}
