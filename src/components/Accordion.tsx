import { PropsWithChildren, useEffect, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import styles from './Receive.module.css'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'

type AccordionProps = PropsWithChildren<{
  defaultOpen?: boolean
  title?: string
}>

const Accordion = ({ children, defaultOpen, title }: AccordionProps) => {
  const settings = useSettings()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (defaultOpen) setIsOpen(defaultOpen)
  }, [defaultOpen])

  return (
    <div className={styles['settings-container']}>
      <rb.Button
        variant={`${settings.theme}`}
        className={`${styles['settings-btn']} d-flex align-items-center`}
        onClick={() => setIsOpen((current) => !current)}
      >
        {title}
        <Sprite symbol={`caret-${isOpen ? 'up' : 'down'}`} className="ms-1" width="20" height="20" />
      </rb.Button>
      {isOpen && children}
      <hr className="m-0" />
    </div>
  )
}

export default Accordion
