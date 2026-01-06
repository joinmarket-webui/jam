export type Currency = 'sats' | 'btc'

export type Milliseconds = number
export type Seconds = number

export type Unbox<T> = T extends Array<infer U> ? U : T
