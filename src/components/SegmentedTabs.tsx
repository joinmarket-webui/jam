import { ChangeEvent } from 'react'
import * as rb from 'react-bootstrap'
import styles from './SegmentedTabs.module.css'

type SegmentedTabValue = string
interface SegmentedTab {
  label: string
  value: SegmentedTabValue
  disabled?: boolean
}

const SegmentedTabFormCheck = ({ id, name, value, label, disabled, checked, onChange }: rb.FormCheckProps) => (
  <div className={styles.segmentedTab}>
    <input
      id={id}
      name={name}
      type="radio"
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <label htmlFor={id}>{label}</label>
  </div>
)

interface SegmentedTabsProps {
  name: string
  tabs: SegmentedTab[]
  onChange: (tab: SegmentedTab) => void
  value?: SegmentedTabValue
  disabled?: boolean
}

export default function SegmentedTabs({ name, tabs, onChange, value, disabled = false }: SegmentedTabsProps) {
  const _onChange = (e: ChangeEvent<HTMLInputElement>, tab: SegmentedTab) => {
    e.stopPropagation()
    onChange(tab)
  }

  return (
    <div className={`segmented-tabs-hook ${styles.segmentedTabs}`}>
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
              onChange={(e) => _onChange(e, tab)}
            />
          )
        })}
      </div>
    </div>
  )
}
