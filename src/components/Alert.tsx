import { useState } from 'react'
import { Alert as BsAlert } from 'react-bootstrap'

export default function Alert({ message, onClose, ...props }: SimpleAlert) {
  const [show, setShow] = useState(true)

  return (
    <BsAlert
      className="my-3"
      onClose={(a: any, b: any) => {
        setShow(false)
        onClose && onClose(a, b)
      }}
      show={show}
      {...props}
    >
      {message}
    </BsAlert>
  )
}
