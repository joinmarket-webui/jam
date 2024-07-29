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

      <rb.Modal
        show={show}
        keyboard={true}
        onEscapeKeyDown={handleClose}
        onHide={handleClose}
        centered={true}
        className={styles['modal']}
        size="lg"
      >
        <rb.Modal.Header className={styles['modalHeader']}>
          <rb.Modal.Title className={styles['modalTitle']}>
            <div>{t('scheduler.confirm_modal.title')}</div>
            <rb.Button onClick={handleClose} className={styles['cancelButton']}>
              <Sprite symbol="cancel" width="26" height="26" />
            </rb.Button>
          </rb.Modal.Title>
        </rb.Modal.Header>
        <rb.Modal.Body className={styles['modalBody']}>{t('scheduler.confirm_modal.body')}</rb.Modal.Body>
        <rb.Modal.Footer className={styles['modalFooter']}>
          <rb.Button variant="light" onClick={handleClose} className="d-flex justify-content-center align-items-center">
            {t('modal.confirm_button_reject')}
          </rb.Button>
          <rb.Button variant="dark" onClick={onConfirm} disabled={disabled}>
            {t('modal.confirm_button_accept')}
          </rb.Button>
        </rb.Modal.Footer>
      </rb.Modal>
    </>
  )
}
