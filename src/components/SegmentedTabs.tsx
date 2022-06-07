import React from 'react'
import * as rb from 'react-bootstrap'
import styles from './SegmentedTabs.module.css'

interface SegmentedTab {
  label: string
  value: string
  disabled?: boolean
}

function SegmentedTabFormCheck({ id, name, value, label, disabled, defaultChecked, onChange }: rb.FormCheckProps) {
  const _onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onChange && onChange(e)
  }

  return (
    <>
      <rb.Form.Check
        bsPrefix={styles['segmented-tab']}
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
    <div className={styles['segmented-tabs']}>
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
              defaultChecked={initialValue === tab.value}
              onChange={(e) => _onChange(e, tab)}
            />
          )
        })}
      </div>
    </div>
  )
}
