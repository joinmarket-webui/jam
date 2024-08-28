import { ReactNode, PropsWithChildren } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import styles from './Modal.module.css'

type BaseModalProps = Pick<rb.ModalProps, 'className' | 'backdrop' | 'size'> &
  Pick<rb.ModalHeaderProps, 'closeButton'> & {
    isShown: boolean
    title: ReactNode | string
    onCancel: () => void
    headerClassName?: rb.ModalHeaderProps['className']
    titleClassName?: rb.ModalTitleProps['className']
  }

const BaseModal = ({
  isShown,
  title,
  children,
  onCancel,
  size,
  backdrop = 'static',
  closeButton = false,
  className = styles.modal,
  headerClassName = styles.modalHeader,
  titleClassName = styles.modalTitle,
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
      className={className}
    >
      <rb.Modal.Header className={headerClassName} closeButton={closeButton}>
        <rb.Modal.Title className={titleClassName}>{title}</rb.Modal.Title>
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
      <rb.Modal.Body className={styles.modalBody}>{children}</rb.Modal.Body>
      <rb.Modal.Footer className={styles.modalFooter}>
        <rb.Button variant="outline-dark" onClick={() => onSubmit()}>
          {submitButtonText}
        </rb.Button>
      </rb.Modal.Footer>
    </BaseModal>
  )
}

export type ConfirmModalProps = Omit<BaseModalProps, 'closeButton'> & {
  onConfirm: () => void
  disabled?: boolean
}

const ConfirmModal = ({
  children,
  onCancel,
  onConfirm,
  disabled = false,
  ...baseModalProps
}: PropsWithChildren<ConfirmModalProps>) => {
  const { t } = useTranslation()

  return (
    <BaseModal {...baseModalProps} onCancel={onCancel}>
      <rb.Modal.Body className={styles.modalBody}>{children}</rb.Modal.Body>
      <rb.Modal.Footer className={styles.modalFooter}>
        <rb.Button
          variant="outline-dark"
          onClick={() => onCancel()}
          className="d-flex justify-content-center align-items-center"
        >
          <Sprite symbol="cancel" width="26" height="26" />
          <div>{t('modal.confirm_button_reject')}</div>
        </rb.Button>
        <rb.Button variant="outline-dark" onClick={() => onConfirm()} disabled={disabled}>
          {t('modal.confirm_button_accept')}
        </rb.Button>
      </rb.Modal.Footer>
    </BaseModal>
  )
}

export { BaseModal, InfoModal, ConfirmModal }
