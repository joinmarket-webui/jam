import { CheckCircle2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Schedule } from './scheduleUtils'

interface SweepSuccessMessageProps {
  schedule: Schedule
  onContinue: () => void
}

export const SweepSuccessMessage = ({ schedule, onContinue }: SweepSuccessMessageProps) => {
  const { t } = useTranslation()

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2Icon className="text-success h-9 w-9" />
        <h2 className="text-2xl font-semibold">{t('scheduler.success.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('scheduler.success.subtitle', { count: schedule.length })}</p>
        <Button type="button" variant="outline" onClick={onContinue}>
          {t('scheduler.success.text_button_submit')}
        </Button>
      </CardContent>
    </Card>
  )
}
