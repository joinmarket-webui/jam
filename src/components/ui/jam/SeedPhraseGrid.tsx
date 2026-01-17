import { cn } from '@/lib/utils'

type MnemonicPhrase = string[]

interface SeedPhraseGridProps {
  value: MnemonicPhrase
  className?: string
  blurred: boolean
  blurredText?: string
}

export const SeedPhraseGrid = ({ value, className, blurred, blurredText = 'random' }: SeedPhraseGridProps) => {
  return (
    <div className={cn('grid grid-cols-2 gap-2 font-mono', className)}>
      {value
        .map((it) => (!blurred ? it : blurredText))
        .map((word, index) => (
          <div key={index} className="bg-background flex min-w-32 items-center gap-2 rounded-lg border p-2">
            <span className="text-muted-foreground inline-block min-w-7 text-right">{index + 1}.</span>
            <span className={!blurred ? undefined : 'blur-[4px]'}>{word}</span>
          </div>
        ))}
    </div>
  )
}
