import { PropsWithChildren, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'

interface AccordionProps {
  title: string
  defaultOpen?: boolean
}

const Accordion = ({ title, defaultOpen = false, children }: PropsWithChildren<AccordionProps>) => {
  const settings = useSettings()
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div>
      <rb.Button
        variant={settings.theme}
        className="d-flex align-items-center bg-transparent border-0 w-100 px-0 py-2"
        onClick={() => setIsOpen((current) => !current)}
      >
        {title}
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
