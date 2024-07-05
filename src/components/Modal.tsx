import { ReactNode, PropsWithChildren } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import styles from './Modal.module.css'
import Sprite from './Sprite'

type BaseModalProps = {
  isShown: boolean
  title: ReactNode | string
  onCancel: () => void
  backdrop?: rb.ModalProps['backdrop']
  size?: rb.ModalProps['size']
  showCloseButton?: boolean
  removeClassName?: boolean
}
const BaseModal = ({
  isShown,
  title,
  children,
  onCancel,
  size,
  backdrop = 'static',
  showCloseButton = false,
  removeClassName = false,
}: PropsWithChildren<BaseModalProps>) => {
  return (
    <rb.Modal
      show={isShown}
      keyboard={true}
      onEscapeKeyDown={() => onCancel()}
      onHide={() => onCancel()}
      centered={true}
      animation={true}
      backdrop={backdrop}
      size={size}
      className={styles.modal}
    >
      <rb.Modal.Header className={!removeClassName && styles['modal-header']} closeButton={showCloseButton}>
        <rb.Modal.Title className={!removeClassName && styles['modal-title']}>{title}</rb.Modal.Title>
      </rb.Modal.Header>
      {children}
    </rb.Modal>
  )
}

export type InfoModalProps = Omit<BaseModalProps, 'backdrop'> & {
  onSubmit: () => void
  submitButtonText: React.ReactNode | string
}

const InfoModal = ({
  children,
  onCancel,
  onSubmit,
  submitButtonText,
  ...baseModalProps
}: PropsWithChildren<InfoModalProps>) => {
  return (
    <BaseModal {...baseModalProps} onCancel={onCancel} backdrop={true}>
      <rb.Modal.Body className={styles['modal-body']}>{children}</rb.Modal.Body>
      <rb.Modal.Footer className={styles['modal-footer']}>
        <rb.Button variant="outline-dark" onClick={() => onSubmit()}>
          {submitButtonText}
        </rb.Button>
      </rb.Modal.Footer>
    </BaseModal>
  )
}

export type ConfirmModalProps = BaseModalProps & {
  onConfirm: () => void
  disabled?: boolean
  confirmVariant?: string
}

const ConfirmModal = ({
  children,
  onCancel,
  onConfirm,
  disabled = false,
  confirmVariant = 'outline-dark',
  ...baseModalProps
}: PropsWithChildren<ConfirmModalProps>) => {
  const { t } = useTranslation()

  return (
    <BaseModal {...baseModalProps} onCancel={onCancel}>
      <rb.Modal.Body className={styles['modal-body']}>{children}</rb.Modal.Body>
      <rb.Modal.Footer className={styles['modal-footer']}>
        <rb.Button
          variant="outline-dark"
          onClick={() => onCancel()}
          className="d-flex justify-content-center align-items-center"
        >
          <Sprite symbol="cancel" width="26" height="26" />
          <div>{t('modal.confirm_button_reject')}</div>
        </rb.Button>
        <rb.Button variant={confirmVariant} onClick={() => onConfirm()} disabled={disabled}>
          {t('modal.confirm_button_accept')}
        </rb.Button>
      </rb.Modal.Footer>
    </BaseModal>
  )
}

export { InfoModal, ConfirmModal }
