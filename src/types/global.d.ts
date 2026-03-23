export type Currency = 'sats' | 'btc'
export type AmountSats = number
export type BitcoinAddress = string
export type JarIndex = number

export type MnemonicPhrase = string[]

export type HdPath =
  | `m/${number}'/${number}'/${number}'` // used internally
  | `m/${number}'/${number}'/${number}'/${number}` // used by jm
  | `m/${number}'/${number}'/${number}'/${number}/${number}` // used by jm
  | `m/${number}'/${number}'/${number}'/${number}/${number}:${number}` // used by jm for Fidelity Bonds
  | `m/${string}` // catch all

export type Milliseconds = number
export type Seconds = number
export type Minutes = number
export type Days = number

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
export type YYYY = `2${Digit}${Digit}${Digit}`
export type MM = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12'

export type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property]
}
