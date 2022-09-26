import { useState } from 'react'
import { Alert as BsAlert, AlertProps as BsAlertProps } from 'react-bootstrap'

export type SimpleMessageAlertProps = BsAlertProps & { message: string }

export default function Alert({ message, onClose, ...props }: SimpleMessageAlertProps) {
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
