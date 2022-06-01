import React from 'react'
import styles from './ToggleSwitch.module.css'

interface ToggleSwitchProps {
  label: string
  subtitle?: string
  labelOff?: string
  labelOffSubtitle?: string
  onToggle: (isToggled: boolean) => void
  initialValue?: boolean
  disabled?: boolean
}

export default function ToggleSwitch({
  label,
  subtitle = undefined,
  labelOff = undefined,
  labelOffSubtitle = undefined,
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
      {labelOff && (
        <div className="d-flex flex-column gap-0 text-end me-3">
          <div>{labelOff}</div>
          {labelOffSubtitle && <div className={`${styles['subtitle']} text-secondary`}>{labelOffSubtitle}</div>}
        </div>
      )}
      <span className={`${styles['toggle-switch']} me-3`}></span>
      <div className="d-flex flex-column gap-0 text-start me-3">
        <div>{label}</div>
        {subtitle && <div className={`${styles['subtitle']} text-secondary`}>{subtitle}</div>}
      </div>
    </label>
  )
}
