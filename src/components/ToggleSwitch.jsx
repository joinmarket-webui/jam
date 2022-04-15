import React from 'react'
import styles from './ToggleSwitch.module.css'

export default function ToggleSwitch({ label, onToggle, initialValue = false, disabled = false }) {
  const onClick = (e) => {
    onToggle(e.target.checked)
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
      {label}
    </label>
  )
}
