// eslint-disable-next-line @typescript-eslint/no-explicit-any -- okay when trying to parse arbitrary value on purpose
export const parseAsIntOrDefault = (value: any, defaultValue: number) => {
  const parsed = Number.parseInt(`${value ?? defaultValue}`, 10)
  return Number.isSafeInteger(parsed) ? parsed : defaultValue
}
