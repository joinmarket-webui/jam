import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

type StepProgressProps = {
  currentStep: number
  totalSteps: number
}

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i < currentStep ? 'bg-primary w-8' : i === currentStep ? 'bg-primary w-12' : 'bg-muted w-8',
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {t('global.step_label', { current: currentStep + 1, total: totalSteps })}
      </p>
    </div>
  )
}
