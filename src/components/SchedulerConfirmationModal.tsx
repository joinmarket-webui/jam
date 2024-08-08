import * as rb from 'react-bootstrap'
import styles from './SchedulerConfirmationModal.module.css'
import { useState } from 'react'
import Sprite from './Sprite'
import { useTranslation } from 'react-i18next'
import { ConfirmModal } from './Modal'

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

      <ConfirmModal
        isShown={show}
        title={t('scheduler.confirm_modal.title')}
        onCancel={handleClose}
        onConfirm={onConfirm}
        size="lg"
        showCloseButton={true}
        headerClassName={styles['modalHeader']}
        titleClassName={styles['modalTitle']}
      >
        <div className={styles['modalBody']}>{t('scheduler.confirm_modal.body')}</div>
      </ConfirmModal>
    </>
  )
}
