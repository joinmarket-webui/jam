import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import styles from './MnemonicWordInput.module.css'

interface MnemonicWordInputProps {
  forwardRef: (el: HTMLInputElement) => void
  index: number
  value: string
  setValue: (value: string, index: number) => void
  isValid?: boolean
  disabled?: boolean
  onFocus?: () => void
  autoFocus?: boolean
}

const MnemonicWordInput = ({
  forwardRef,
  index,
  value,
  setValue,
  isValid,
  disabled,
  onFocus,
  autoFocus,
}: MnemonicWordInputProps) => {
  const { t } = useTranslation()
  return (
    <rb.InputGroup>
      <rb.InputGroup.Text className={styles.seedwordIndexBackup}>{index + 1}.</rb.InputGroup.Text>
      <rb.Form.Control
        ref={forwardRef}
        type="text"
        placeholder={`${t('create_wallet.placeholder_seed_word_input')} ${index + 1}`}
        value={value}
        onChange={(e) => setValue(e.target.value.trim(), index)}
        className={styles.input}
        disabled={disabled}
        isInvalid={isValid === false && value.length > 0}
        isValid={isValid === true}
        onFocus={onFocus}
        autoFocus={autoFocus}
        required
      />
    </rb.InputGroup>
  )
}

export default MnemonicWordInput
