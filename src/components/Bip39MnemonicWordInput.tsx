import React from 'react'
import MnemonicWordInput, { MnemonicWordInputProps } from './MnemonicWordInput'
import { MNEMONIC_WORDS } from '../constants/bip39words'

const Bip39MnemonicWordInput: React.FC<MnemonicWordInputProps> = (props) => {
  const { value } = props
  const isBip39Value = MNEMONIC_WORDS.includes(value)

  return <MnemonicWordInput {...props} isValid={isBip39Value} />
}

export default Bip39MnemonicWordInput
