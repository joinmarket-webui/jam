import { cn } from '@/lib/utils'
import type { SeedPhrase } from '@/types/global'

interface SeedPhraseGridProps {
  value: SeedPhrase
  className?: string
  blurred: boolean
  blurredText?: string
}

export const SeedPhraseGrid = ({ value, className, blurred, blurredText = 'random' }: SeedPhraseGridProps) => {
  return (
    <div className={cn('grid grid-cols-2 gap-2 font-mono', className, 'select-none')}>
      {value
        .map((it) => (!blurred ? it : blurredText))
        .map((word, index) => (
          <div key={index} className="bg-background flex min-w-32 items-center gap-2 rounded-lg border p-2">
            <span className="text-muted-foreground/60 inline-block min-w-8 ps-1 text-right tabular-nums">
              {index + 1}.
            </span>
            <span className={!blurred ? undefined : 'blur-[4px]'}>{word}</span>
          </div>
        ))}
    </div>
  )
}
