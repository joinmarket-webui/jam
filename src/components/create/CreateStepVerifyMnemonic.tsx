import { useCallback, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2Icon, ChevronLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import { cn } from '@/lib/utils'
import type { MnemonicPhrase } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'

const skipWalletBackupVerification = isDebugFeatureEnabled('skipWalletBackupVerification')

function shuffleArray(array: string[]): string[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const index = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[index]] = [result[index], result[i]]
  }
  return result
}

interface CreateStepVerifyMnemonicProps {
  mnemonicPhrase: MnemonicPhrase
  onVerified: () => Promise<void>
  onBack: () => void
}

export const CreateStepVerifyMnemonic = ({ mnemonicPhrase, onVerified, onBack }: CreateStepVerifyMnemonicProps) => {
  const { t } = useTranslation()
  const [selectedWords, setSelectedWords] = useState<string[]>([])
  const [wrongButtonIndex, setWrongButtonIndex] = useState<number>()
  const [shuffledWords] = useState(() => shuffleArray(mnemonicPhrase))

  const [pickedIndicesOrder, setPickedIndicesOrder] = useState<number[]>([])
  const pickedIndicesSet = useMemo(() => new Set(pickedIndicesOrder), [pickedIndicesOrder])

  const handleWordClick = useCallback(
    (word: string, shuffledIndex: number) => {
      if (pickedIndicesSet.has(shuffledIndex)) return
      if (wrongButtonIndex !== undefined) return

      const nextPosition = selectedWords.length
      const expectedWord = mnemonicPhrase[nextPosition]

      if (word !== expectedWord) {
        setWrongButtonIndex(shuffledIndex)
        setTimeout(() => setWrongButtonIndex(undefined), 600)
        return
      }

      setSelectedWords((previous) => [...previous, word])
      setPickedIndicesOrder((previous) => [...previous, shuffledIndex])
    },
    [mnemonicPhrase, selectedWords, pickedIndicesSet, wrongButtonIndex],
  )

  const progress = selectedWords.length
  const total = mnemonicPhrase.length
  const allSelected = progress === total
  const isCorrect = allSelected && selectedWords.every((w, i) => w === mnemonicPhrase[i])

  const verifyMutation = useMutation({
    mutationFn: async ({ mustBeCorrect }: { mustBeCorrect: boolean }) => {
      if (mustBeCorrect && !isCorrect) return
      return await onVerified()
    },
    retry: false,
  })

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-muted-foreground text-center text-sm">{t('create_wallet.verify_mnemonic.subtitle')}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {t('create_wallet.verify_mnemonic.progress', { current: progress, total })}
            </span>
          </div>
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className={cn('h-full rounded-full transition-all duration-300 ease-out', {
                'bg-green-100/50': isCorrect,
                'bg-primary': !isCorrect,
              })}
              style={{ width: `${(progress / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className={cn('min-h-[100px] rounded-lg border-2 border-dashed p-2.5 transition-colors', {
          'border-destructive/50': wrongButtonIndex !== undefined,
          'border-muted-foreground/20': wrongButtonIndex === undefined,
          'border-green-300/50 bg-green-600/5': allSelected && isCorrect,
        })}
      >
        <div className="grid grid-cols-3 gap-1.5">
          {mnemonicPhrase.map((_, index) => {
            const word = selectedWords[index]
            const isFilled = word !== undefined
            return (
              <div
                key={index}
                className={cn('flex items-center gap-0.5 rounded-md px-0.5 py-1.5 font-mono text-xs transition-all', {
                  'bg-primary/10 text-primary border-primary/20 border': isFilled,
                  'border-muted bg-muted/30 border border-dashed': !isFilled,
                })}
              >
                <span
                  className={cn('min-w-8 text-right tabular-nums', {
                    'text-primary/50': isFilled,
                    'text-muted-foreground/40': !isFilled,
                  })}
                >
                  {index + 1}.
                </span>
                {isFilled ? (
                  <span className="font-medium">{word}</span>
                ) : (
                  <span className="text-muted-foreground/30">···</span>
                )}
              </div>
            )
          })}
        </div>
        {allSelected && isCorrect && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-sm font-medium text-green-300">
            <CheckCircle2Icon className="size-4" />
            {t('create_wallet.verify_mnemonic.feedback_mnemonic_confirmed')}
          </div>
        )}
      </div>

      {!allSelected && (
        <div className="grid grid-cols-3 gap-2">
          {shuffledWords.map((word, index) => {
            const isPicked = pickedIndicesSet.has(index)
            const isWrong = wrongButtonIndex === index
            return (
              <Button
                key={index}
                type="button"
                size="lg"
                variant={isWrong ? 'destructive' : isPicked ? 'outline' : 'secondary'}
                disabled={isPicked || wrongButtonIndex !== undefined}
                className={cn('font-mono text-sm transition-all', {
                  'pointer-events-none opacity-25': isPicked,
                  'animate-shake': isWrong,
                })}
                onClick={() => handleWordClick(word, index)}
              >
                {isPicked ? '···' : word}
              </Button>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn('flex-1', {
            hidden: isCorrect,
          })}
          size="xxl"
          onClick={onBack}
          disabled={isCorrect || verifyMutation.isPending}
        >
          <ChevronLeftIcon />
          {t('create_wallet.back_button')}
        </Button>
        {skipWalletBackupVerification && !isCorrect && (
          <Button
            type="button"
            className="flex-1"
            variant="secondary"
            size="xxl"
            onClick={() => verifyMutation.mutate({ mustBeCorrect: false })}
          >
            Skip <DevBadge />
          </Button>
        )}
        <Button
          type="button"
          className="flex-1"
          size="xxl"
          disabled={!isCorrect || verifyMutation.isPending}
          onClick={() => verifyMutation.mutate({ mustBeCorrect: true })}
        >
          {t('create_wallet.confirmation_button_fund_wallet')}
        </Button>
      </div>
    </div>
  )
}
