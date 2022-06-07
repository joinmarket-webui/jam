import React from 'react'
import * as rb from 'react-bootstrap'
import styles from './RadioTabs.module.css'

interface RadioTab {
  label: string
  value: string
  disabled?: boolean
}

function RadioTabFormCheck({ id, name, value, label, disabled, defaultChecked, onChange }: rb.FormCheckProps) {
  const _onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onChange && onChange(e)
  }

  return (
    <>
      <rb.Form.Check
        bsPrefix={styles['radio-tab']}
        type="radio"
        id={id}
        value={value}
        name={name}
        label={label}
        disabled={disabled}
        defaultChecked={defaultChecked}
        onChange={_onChange}
      />
    </>
  )
}

interface RadioTabsProps {
  name: string
  tabs: RadioTab[]
  onChange: (tab: RadioTab, checked: boolean) => void
  initialValue?: string
  disabled?: boolean
}

export default function RadioTabs({ name, tabs, onChange, initialValue, disabled = false }: RadioTabsProps) {
  const _onChange = (e: React.ChangeEvent<HTMLInputElement>, tab: RadioTab) => {
    e.stopPropagation()
    onChange(tab, e.currentTarget.checked)
  }

  return (
    <div className={styles['radio-tabs']}>
      <div className="d-flex gap-1">
        {tabs.map((tab, index) => {
          return (
            <RadioTabFormCheck
              key={index}
              id={`${name}-${index}`}
              name={name}
              label={tab.label}
              disabled={disabled || tab.disabled}
              inline={true}
              defaultChecked={initialValue === tab.value}
              onChange={(e) => _onChange(e, tab)}
            />
          )
        })}
      </div>
    </div>
  )
}
