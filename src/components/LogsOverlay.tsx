import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import PageTitle from '@/components/ui/jam/PageTitle'
import type { WithRequiredProperty } from '@/types/global'
import { LogsContent } from './LogsContent'

type LogsOverlayProps = WithRequiredProperty<Omit<ComponentProps<typeof Dialog>, 'children'>, 'open' | 'onOpenChange'>

export function LogsOverlay({ open, onOpenChange }: LogsOverlayProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(false)}>
      <DialogContent className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom flex h-screen max-w-screen! flex-col rounded-none border-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PageTitle title={t('logs.title')} />
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-hidden">
          <LogsContent enabled={open} className="flex h-full flex-col" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
