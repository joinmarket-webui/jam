import { useMemo } from 'react'
import MnemonicWordInput, { MnemonicWordInputProps } from './MnemonicWordInput'
import { MNEMONIC_WORDS } from '../constants/bip39words'

const Bip39MnemonicWordInput = ({ value, ...props }: MnemonicWordInputProps) => {
  const isBip39Value = useMemo(() => MNEMONIC_WORDS.includes(value), [value])

  return <MnemonicWordInput {...props} value={value} isValid={isBip39Value && (props.isValid ?? true)} />
}

export default Bip39MnemonicWordInput
