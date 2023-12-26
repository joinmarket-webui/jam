import React from 'react'
import * as rb from 'react-bootstrap'
import styles from './SegmentedTabs.module.css'

interface SegmentedTab {
  label: string
  value: string
  disabled?: boolean
}

function SegmentedTabFormCheck({ id, name, value, label, disabled, checked, onChange }: rb.FormCheckProps) {
  const _onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onChange && onChange(e)
  }

  return (
    <>
      <div className={styles['segmented-tab']}>
        <input
          id={id}
          name={name}
          type="radio"
          value={value}
          checked={checked}
          onChange={_onChange}
          disabled={disabled}
        />
        <label htmlFor={id}>{label}</label>
      </div>
    </>
  )
}

interface SegmentedTabsProps {
  name: string
  tabs: SegmentedTab[]
  onChange: (tab: SegmentedTab, checked: boolean) => void
  initialValue?: string
  disabled?: boolean
}

export default function SegmentedTabs({ name, tabs, onChange, initialValue, disabled = false }: SegmentedTabsProps) {
  const _onChange = (e: React.ChangeEvent<HTMLInputElement>, tab: SegmentedTab) => {
    e.stopPropagation()
    onChange(tab, e.currentTarget.checked)
  }

  return (
    <div className={['segmented-tabs-hook', styles['segmented-tabs']].join(' ')}>
      <div className="d-flex gap-1">
        {tabs.map((tab, index) => {
          return (
            <SegmentedTabFormCheck
              key={index}
              id={`${name}-${index}`}
              name={name}
              label={tab.label}
              disabled={disabled || tab.disabled}
              inline={true}
              checked={initialValue === tab.value}
              onChange={(e) => _onChange(e, tab)}
            />
          )
        })}
      </div>
    </div>
  )
}
