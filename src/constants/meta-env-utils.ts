// eslint-disable-next-line @typescript-eslint/no-explicit-any -- okay when trying to parse arbitrary value on purpose
export const parseAsIntOrDefault = (value: any, defaultValue: number): number => {
  const parsed = Number.parseInt(`${value ?? Number.NaN}`, 10)
  return Number.isSafeInteger(parsed) ? parsed : defaultValue
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- okay when trying to parse arbitrary value on purpose
export const parseAsBooleanOrDefault = (value: any, defaultValue: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value
  } else if (typeof value === 'string') {
    const lowercased = value.trim().toLowerCase()
    if (['true', 'yes', '1'].includes(lowercased)) {
      return true
    }
    if (['false', 'no', '0'].includes(lowercased)) {
      return false
    }
  } else {
    const asNumber = parseAsIntOrDefault(value, Number.NaN)
    if (asNumber === 1) {
      return true
    }
    if (asNumber === 0) {
      return false
    }
  }

  return defaultValue
}
