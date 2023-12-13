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
}
const BaseModal = ({
  isShown,
  title,
  children,
  onCancel,
  size,
  backdrop = 'static',
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
      <rb.Modal.Header className={styles['modal-header']}>
        <rb.Modal.Title className={styles['modal-title']}>{title}</rb.Modal.Title>
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
  isShown,
  title,
  children,
  onCancel,
  onSubmit,
  submitButtonText,
  size,
}: PropsWithChildren<InfoModalProps>) => {
  return (
    <BaseModal isShown={isShown} title={title} onCancel={onCancel} backdrop={true} size={size}>
      <rb.Modal.Body className={styles['modal-body']}>{children}</rb.Modal.Body>
      <rb.Modal.Footer className={styles['modal-footer']}>
        <rb.Button variant="outline-dark" onClick={() => onSubmit()}>
          {submitButtonText}
        </rb.Button>
      </rb.Modal.Footer>
    </BaseModal>
  )
}

export type ConfirmModalProps = Omit<InfoModalProps, 'onSubmit' | 'submitButtonText'> & {
  onConfirm: () => void
}

const ConfirmModal = ({ isShown, title, children, onCancel, onConfirm }: PropsWithChildren<ConfirmModalProps>) => {
  const { t } = useTranslation()

  return (
    <BaseModal isShown={isShown} title={title} onCancel={onCancel}>
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
        <rb.Button variant="outline-dark" onClick={() => onConfirm()}>
          {t('modal.confirm_button_accept')}
        </rb.Button>
      </rb.Modal.Footer>
    </BaseModal>
  )
}

export { InfoModal, ConfirmModal }
