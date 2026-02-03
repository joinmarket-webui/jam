import { cn } from '@/lib/utils'

type StepProgressProps = {
  currentStep: number
  totalSteps: number
}

export function StepProgress({ currentStep, totalSteps }: StepProgressProps) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
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
  )
}
