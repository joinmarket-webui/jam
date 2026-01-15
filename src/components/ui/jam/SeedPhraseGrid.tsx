import { cn } from '@/lib/utils'

type MnemonicPhrase = string[]

interface SeedPhraseGridProps {
  value: MnemonicPhrase
  className?: string
}

export const SeedPhraseGrid = ({ value, className }: SeedPhraseGridProps) => {
  return (
    <div className={cn('grid grid-cols-2 gap-2 font-mono', className)}>
      {value.map((word, index) => (
        <div key={index} className="bg-background flex items-center gap-2 rounded-lg border p-2">
          <span className="text-muted-foreground inline-block min-w-7 text-right">{index + 1}.</span>
          {word}
        </div>
      ))}
    </div>
  )
}
