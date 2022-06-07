import React from 'react'
import styles from './ToggleSwitch.module.css'

interface ToggleSwitchProps {
  label: string
  subtitle?: string
  onToggle: (isToggled: boolean) => void
  initialValue?: boolean
  disabled?: boolean
}

export default function ToggleSwitch({
  label,
  subtitle = undefined,
  onToggle,
  initialValue = false,
  disabled = false,
}: ToggleSwitchProps) {
  const onClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onToggle(e.currentTarget.checked)
  }

  return (
    <label className={`${styles['toggle-switch-label']}`}>
      <input
        type="checkbox"
        className={`${styles['peer']} ${styles['toggle-switch-input']}`}
        onClick={onClick}
        defaultChecked={initialValue}
        disabled={disabled}
      />
      <span className={styles['toggle-switch']}></span>
      <div className="d-flex flex-column gap-0">
        <div>{label}</div>
        {subtitle && <div className={`${styles['subtitle']} text-secondary`}>{subtitle}</div>}
      </div>
    </label>
  )
}
