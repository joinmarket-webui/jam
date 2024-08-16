import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import Sprite from './Sprite'
import styles from './Divider.module.css'

type DividerProps = rb.ColProps & {
  toggled: boolean
  onToggle: (current: boolean) => void
  disabled?: boolean
  className?: string
}

export default function Divider({ toggled, onToggle, disabled, className, ...colProps }: DividerProps) {
  return (
    <rb.Row className={classNames('d-flex', 'justify-content-center', className)}>
      <rb.Col xs={12} {...colProps}>
        <div className={styles.dividerContainer}>
          <hr className={styles.dividerLine} />
          <button className={styles.dividerButton} disabled={disabled} onClick={() => onToggle(toggled)}>
            <Sprite symbol={toggled ? 'caret-up' : 'caret-down'} width="20" height="20" />
          </button>
          <hr className={styles.dividerLine} />
        </div>
      </rb.Col>
    </rb.Row>
  )
}
