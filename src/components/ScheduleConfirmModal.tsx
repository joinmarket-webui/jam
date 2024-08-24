import { ConfirmModal, ConfirmModalProps } from './Modal'
import { useTranslation } from 'react-i18next'

interface ScheduleConfirmModalProps extends ConfirmModalProps {
  showCloseButton: boolean
  disabled: boolean
}
export default function ScheduleConfirmModal({
  isShown,
  title,
  onCancel,
  onConfirm,
  showCloseButton,
  disabled,
}: ScheduleConfirmModalProps) {
  const { t } = useTranslation()
  return (
    <>
      <ConfirmModal
        isShown={isShown}
        title={title}
        onCancel={onCancel}
        onConfirm={onConfirm}
        closeButton={showCloseButton}
        disabled={disabled}
      >
        {t('scheduler.confirm_modal.body')}
      </ConfirmModal>
    </>
  )
}
