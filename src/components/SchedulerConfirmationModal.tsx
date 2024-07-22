import * as rb from 'react-bootstrap'
import styles from './SchedulerConfirmationModal.module.css'
import { useState } from 'react'
import Sprite from './Sprite'
import { useTranslation } from 'react-i18next'

interface SchedulerConfirmationModalProps {
  onConfirm: () => void
  disabled: boolean
}

export default function SchedulerConfirmationModal({ onConfirm, disabled }: SchedulerConfirmationModalProps) {
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

      <rb.Modal show={show} onHide={handleClose} dialogClassName={styles['modal']}>
        <rb.Modal.Header closeButton>
          <rb.Modal.Title>
            <div>{t('scheduler.confirm_modal.title')}</div>
          </rb.Modal.Title>
        </rb.Modal.Header>
        <rb.Modal.Body>{t('scheduler.confirm_modal.body')}</rb.Modal.Body>
        <rb.Modal.Footer className={styles['modalFooter']}>
          <rb.Button variant="light" onClick={handleClose} className="d-flex justify-content-center align-items-center">
            {t('modal.confirm_button_reject')}
          </rb.Button>
          <rb.Button variant="dark" onClick={onConfirm}>
            {t('modal.confirm_button_accept')}
          </rb.Button>
        </rb.Modal.Footer>
      </rb.Modal>
    </>
  )
}
