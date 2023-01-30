import { PropsWithChildren, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'

interface AccordionInfoProps {
  title: string
  defaultOpen?: boolean
}

const AccordionInfo = ({ title, defaultOpen = false, children }: PropsWithChildren<AccordionInfoProps>) => {
  const settings = useSettings()
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mt-4">
      <rb.Button
        variant={settings.theme}
        className="d-flex align-items-center justify-content-end bg-transparent border-0 w-100 px-0 py-2"
        style={{ fontSize: '0.75rem' }}
        onClick={() => setIsOpen((current) => !current)}
      >
        <Sprite symbol={`caret-${isOpen ? 'up' : 'down'}`} className="me-1" width="10" height="10" />
        {title}
      </rb.Button>
      <rb.Collapse in={isOpen}>
        <div>{children}</div>
      </rb.Collapse>
    </div>
  )
}

export default AccordionInfo
