declare type JarIndex = number

declare type Unit = 'BTC' | 'sats'

type Milliseconds = number
type Seconds = number

declare type MnemonicPhrase = string[]

declare type SimpleAlert = import('react-bootstrap').AlertProps & { message: string | import('react').ReactNode }

declare type SemVer = { major: number; minor: number; patch: number; raw?: string }
