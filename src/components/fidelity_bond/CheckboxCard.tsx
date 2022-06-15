import React, { useRef, PropsWithChildren } from 'react'
import * as rb from 'react-bootstrap'

import Sprite from '../Sprite'
import styles from './CheckboxCard.module.css'

export interface CheckboxCardProps extends rb.FormCheckProps {}

const CheckboxCard = ({ children, checked, disabled, ...props }: PropsWithChildren<CheckboxCardProps>) => {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <rb.Card
        text={checked ? 'success' : disabled ? 'secondary' : undefined}
        border={checked ? 'success' : undefined}
        tabIndex={disabled ? undefined : 0}
        className={`${styles['checkbox-card']} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''}`}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()

          !disabled && ref.current?.click()
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
          e.key === ' ' && ref.current?.click()
        }}
      >
        <rb.Form.Check className="d-none" ref={ref} checked={checked} disabled={disabled} {...props} />
        <div className="d-flex align-items-center">
          <div className={`${styles['sprite-container']}`}>
            {checked && <Sprite symbol="checkmark" width="24" height="24" />}
            {!checked && disabled && <Sprite symbol="cross" width="24" height="24" />}
          </div>
          <>{children}</>
        </div>
      </rb.Card>
    </>
  )
}

export default CheckboxCard
