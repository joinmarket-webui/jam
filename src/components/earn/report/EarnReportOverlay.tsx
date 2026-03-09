import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageTitle from '@/components/ui/jam/PageTitle'
import type { WithRequiredProperty } from '@/types/global'
import { EarnReportContent } from './EarnReportContent'

type EarnReportOverlayProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
>

export const EarnReportOverlay = ({ open, onOpenChange, ...dialogProps }: EarnReportOverlayProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange} {...dialogProps}>
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-screen max-w-screen! flex-col rounded-none border-none">
        <DialogHeader>
          <DialogTitle>
            <PageTitle title={t('earn.report.title')} />
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <EarnReportContent enabled={open} className="flex h-full flex-col p-2 pt-0" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
