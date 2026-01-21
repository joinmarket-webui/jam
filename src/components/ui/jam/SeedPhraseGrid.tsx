import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import type { SeedPhrase } from '@/types/global'
import { MaskedText } from './MaskedText'

type SeedPhraseGridProps = ComponentProps<typeof MaskedText> & {
  value: SeedPhrase
  className?: string
}

export const SeedPhraseGrid = ({ value, className, masked, maskedText }: SeedPhraseGridProps) => {
  return (
    <div className={cn('grid grid-cols-2 gap-2 font-mono', className, 'select-none')}>
      {value.map((word, index) => (
        <div key={index} className="bg-background flex min-w-32 items-center gap-2 rounded-lg border p-2">
          <span className="text-muted-foreground/60 inline-block min-w-8 ps-1 text-right tabular-nums">
            {index + 1}.
          </span>
          <MaskedText masked={masked} maskedText={maskedText}>
            {word}
          </MaskedText>
        </div>
      ))}
    </div>
  )
}
