import React from 'react'
import * as rb from 'react-bootstrap'
import styles from './SegmentedTabs.module.css'

type SegmentedTabValue = string
interface SegmentedTab {
  label: string
  value: SegmentedTabValue
  disabled?: boolean
}

<<<<<<< HEAD
function SegmentedTabFormCheck({ id, name, value, label, disabled, checked, onChange }: rb.FormCheckProps) {
=======
function SegmentedTabFormCheck(props: rb.FormCheckProps) {
>>>>>>> 6149e4a (chore: fix SegmentedTabs active state)
  const _onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    props.onChange && props.onChange(e)
  }

  return (
    <>
<<<<<<< HEAD
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
=======
      <rb.Form.Check {...props} bsPrefix={styles['segmented-tab']} type="radio" onChange={_onChange} />
>>>>>>> 6149e4a (chore: fix SegmentedTabs active state)
    </>
  )
}

interface SegmentedTabsProps {
  name: string
  tabs: SegmentedTab[]
  onChange: (tab: SegmentedTab, checked: boolean) => void
  value?: SegmentedTabValue
  disabled?: boolean
}

export default function SegmentedTabs({ name, tabs, onChange, value, disabled = false }: SegmentedTabsProps) {
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
              value={tab.value}
              disabled={disabled || tab.disabled}
              checked={value === tab.value}
              inline={true}
<<<<<<< HEAD
              checked={initialValue === tab.value}
=======
>>>>>>> 6149e4a (chore: fix SegmentedTabs active state)
              onChange={(e) => _onChange(e, tab)}
            />
          )
        })}
      </div>
    </div>
  )
}
