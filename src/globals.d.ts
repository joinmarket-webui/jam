declare type JarIndex = number

declare type Unit = 'BTC' | 'sats'

declare type MnemonicPhrase = string[]

declare type SimpleAlert = import('react-bootstrap').AlertProps & { message: string | import('react').ReactNode }
