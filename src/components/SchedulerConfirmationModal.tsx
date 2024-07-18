import * as rb from 'react-bootstrap'
import styles from './SchedulerConfirmationModal.module.css'
import { useState } from 'react'
import Sprite from './Sprite'

import { useTranslation } from 'react-i18next'

interface SchedulerConfirmationModalProps {
  isShown: boolean
  title: string
  onConfirm: () => void
  disabled: boolean
}

export default function SchedulerConfirmationModal({
  isShown,
  title,
  onConfirm,
  disabled,
}: SchedulerConfirmationModalProps) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)

  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)
  return (
    <>
      <rb.Button className="w-100 mb-4" variant="dark" size="lg" disabled={disabled} onClick={handleShow}>
        <div className="d-flex justify-content-center align-items-center">
          {t('scheduler.button_start')}
          <Sprite symbol="caret-right" width="24" height="24" className="ms-1" />
        </div>
      </rb.Button>

      <rb.Modal show={show} onHide={handleClose}>
        <rb.Modal.Header closeButton>
          <rb.Modal.Title>Start Scheduler</rb.Modal.Title>
        </rb.Modal.Header>
        <rb.Modal.Body>Do You Really Want to Start the Scheduler? </rb.Modal.Body>
        <rb.Modal.Footer>
          <rb.Button variant="secondary" onClick={handleClose}>
            No, Go Back!
          </rb.Button>
          <rb.Button variant="primary">Yes, Start It!</rb.Button>
        </rb.Modal.Footer>
      </rb.Modal>
    </>
  )
}
