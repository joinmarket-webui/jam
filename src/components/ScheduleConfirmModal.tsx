import { PropsWithChildren } from 'react'
import { ConfirmModal, ConfirmModalProps } from './Modal'
import { useTranslation } from 'react-i18next'

type ScheduleConfirmModalProps = ConfirmModalProps
export default function ScheduleConfirmModal({
  isShown,
  title,
  onCancel,
  onConfirm,
  closeButton,
  disabled,
}: PropsWithChildren<ScheduleConfirmModalProps>) {
  const { t } = useTranslation()
  return (
    <ConfirmModal
      isShown={isShown}
      title={title}
      onCancel={onCancel}
      onConfirm={onConfirm}
      closeButton={closeButton}
      disabled={disabled}
    >
      {t('scheduler.confirm_modal.body')}
    </ConfirmModal>
  )
}
