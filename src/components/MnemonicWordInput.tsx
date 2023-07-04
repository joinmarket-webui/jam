import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import styles from './CreateWallet.module.css'

interface MnemonicWordInputProps {
  index: number
  value: string
  setValue: (value: string) => void
  isValid?: boolean
  disabled?: boolean
}

const MnemonicWordInput = ({ index, value, setValue, isValid, disabled }: MnemonicWordInputProps) => {
  const { t } = useTranslation()
  return (
    <rb.InputGroup>
      <rb.InputGroup.Text className={styles.seedwordIndexBackup}>{index + 1}.</rb.InputGroup.Text>
      <rb.FormControl
        type="text"
        placeholder={`${t('create_wallet.placeholder_seed_word_input')} ${index + 1}`}
        value={value}
        onChange={(e) => setValue(e.target.value.trim())}
        className={styles.input}
        disabled={disabled}
        isInvalid={isValid === false && value.length > 0}
        isValid={isValid === true}
        required
      />
    </rb.InputGroup>
  )
}

export default MnemonicWordInput
