import { ReactNode, PropsWithChildren, useState } from 'react'
import classNames from 'classnames'
import { useSettings } from '../context/SettingsContext'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'

interface AccordionProps {
  title: ReactNode | string
  defaultOpen?: boolean
  disabled?: boolean
  variant?: 'warning' | 'danger'
}

const Accordion = ({
  title,
  defaultOpen = false,
  disabled = false,
  variant,
  children,
}: PropsWithChildren<AccordionProps>) => {
  const settings = useSettings()
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div>
      <rb.Button
        variant={settings.theme}
        className="d-flex align-items-center bg-transparent border-0 w-100 px-0 py-2"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
      >
        <div
          className={classNames('d-flex align-items-center', {
            'text-danger': variant === 'danger',
          })}
        >
          {variant && (
            <div
              className={classNames('badge rounded-pill p-0 me-2', {
                'text-dark': variant === 'warning',
                'bg-warning': variant === 'warning',
                'text-light': variant === 'danger',
                'bg-danger': variant === 'danger',
              })}
            >
              <Sprite symbol="warn" width="20" height="20" />
            </div>
          )}
          {title}
        </div>
        <Sprite symbol={`caret-${isOpen ? 'up' : 'down'}`} className="ms-1" width="20" height="20" />
      </rb.Button>
      <hr className="m-0 pb-4 text-secondary" />
      <rb.Collapse in={isOpen}>
        <div>{children}</div>
      </rb.Collapse>
    </div>
  )
}

export default Accordion
