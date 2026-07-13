import type { ComponentProps, ReactNode } from 'react'
import { AlertTriangleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StepProgress } from './StepProgress'

type FidelityBondDialogLayoutProps = Omit<ComponentProps<typeof Dialog>, 'children'> & {
  title: string
  /** zero-based wizard step, or undefined to hide the progress indicator (pending/success states) */
  currentStep?: number
  totalSteps: number
  error?: string
  footer: ReactNode
  children: ReactNode
}

export function FidelityBondDialogLayout({
  title,
  currentStep,
  totalSteps,
  error,
  footer,
  children,
  ...dialogProps
}: FidelityBondDialogLayoutProps) {
  const { t } = useTranslation()
  return (
    <Dialog {...dialogProps}>
      <DialogContent className="flex max-h-[90dvh] flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription>{t('earn.fidelity_bond.subtitle')}</DialogDescription>
        </DialogHeader>

        {currentStep !== undefined && <StepProgress currentStep={currentStep} totalSteps={totalSteps} />}

        {error && (
          <Alert variant="destructive" className="animate-in fade-in-50">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto py-2">{children}</div>

        {footer && <DialogFooter className="gap-3 sm:gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}
