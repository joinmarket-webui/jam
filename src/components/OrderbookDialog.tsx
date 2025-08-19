import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Orderbook } from './Orderbook'

interface OrderbookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderbookDialog({ open, onOpenChange }: OrderbookDialogProps) {
  const { t } = useTranslation()

  if (!open) return null

  return (
    <div className="light:bg-white fixed inset-0 z-50 flex flex-col bg-zinc-900">
      {/* Header with close button */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold">{t('orderbook.title')}</h1>
        <Button variant="ghost" size="lg" onClick={() => onOpenChange(false)} className="h-8 w-8 p-0">
          <X className="h-10 w-10" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Orderbook content */}
      <div className="flex-1 overflow-hidden">
        <Orderbook isModal={true} />
      </div>
    </div>
  )
}
