import { PropsWithChildren, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'

type AccordionProps = PropsWithChildren<{
  defaultOpen?: boolean
  title?: string
}>

const Accordion = ({ children, defaultOpen = false, title }: AccordionProps) => {
  const settings = useSettings()
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mt-4">
      <rb.Button
        variant={settings.theme}
        className="d-flex align-items-center bg-transparent border-0 w-100 px-0 py-2"
        onClick={() => setIsOpen((current) => !current)}
      >
        {title}
        <Sprite symbol={`caret-${isOpen ? 'up' : 'down'}`} className="ms-1" width="20" height="20" />
      </rb.Button>
      <hr className="m-0 text-secondary" />
      {isOpen && <div className="py-4">{children}</div>}
    </div>
  )
}

export default Accordion
