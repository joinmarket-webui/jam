import type { ReactNode } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type WizardStepFooterProps = {
  /** omit to hide the back button (first step) */
  onBack?: () => void
  onCancel: () => void
  primaryLabel: ReactNode
  onPrimary: () => void
  primaryDisabled?: boolean
  isLoading?: boolean
}

export function WizardStepFooter({
  onBack,
  onCancel,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  isLoading = false,
}: WizardStepFooterProps) {
  const { t } = useTranslation()
  return (
    <>
      {onBack && (
        <Button variant="ghost" onClick={onBack} disabled={isLoading}>
          <ChevronLeftIcon />
          {t('global.back')}
        </Button>
      )}
      <Button variant="outline" onClick={onCancel} disabled={isLoading}>
        {t('global.cancel')}
      </Button>
      <Button onClick={onPrimary} disabled={primaryDisabled || isLoading}>
        {isLoading && <Spinner className="mr-2 h-4 w-4" />}
        {primaryLabel}
      </Button>
    </>
  )
}
