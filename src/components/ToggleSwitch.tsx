import { ChangeEvent } from 'react'
import styles from './ToggleSwitch.module.css'

interface ToggleSwitchProps {
  label: string
  subtitle?: string
  onToggle: (isToggled: boolean) => void
  toggledOn: boolean
  disabled?: boolean
}

export default function ToggleSwitch({
  label,
  subtitle = undefined,
  onToggle,
  toggledOn,
  disabled = false,
}: ToggleSwitchProps) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onToggle(e.currentTarget.checked)
  }

  return (
    <label className={`${styles['toggle-switch-label']}`}>
      <input
        type="checkbox"
        className={`${styles['peer']} ${styles['toggle-switch-input']}`}
        onChange={onChange}
        checked={toggledOn}
        disabled={disabled}
      />
      <span className={styles['toggle-switch']}></span>
      <div className="d-flex flex-column gap-0">
        <div>{label}</div>
        {subtitle && <div className="text-secondary text-small">{subtitle}</div>}
      </div>
    </label>
  )
}
