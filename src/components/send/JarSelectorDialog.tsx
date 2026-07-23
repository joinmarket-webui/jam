import { useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { BalanceSummary } from '@/lib/balanceSummary'
import type { JarIndex, WithRequiredProperty } from '@/types/global'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from '../ui/dialog'
import { SelectableJar } from '../ui/jam/SelectableJar'
import { Spinner } from '../ui/spinner'

type JarSelectorDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  title: string
  subtitle?: string
  jars: Jar[]
  disabledJars: Jar[]
  walletBalanceSummary: BalanceSummary
  onConfirm: (jar: JarIndex) => Promise<void>
}

export default function JarSelectorDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  jars,
  disabledJars,
  walletBalanceSummary,
  onConfirm,
  ...dialogProps
}: JarSelectorDialogProps) {
  const { t } = useTranslation()

  const [isConfirming, setIsConfirming] = useState(false)
  const [selectedJar, setSelectedJar] = useState<Jar>()

  const handleClose = () => {
    setSelectedJar(undefined)
    onOpenChange(false)
  }

  const confirm = async () => {
    if (selectedJar === undefined) return

    setIsConfirming(true)
    try {
      await onConfirm(selectedJar.jarIndex)
      setSelectedJar(undefined)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} {...dialogProps}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="py-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {jars.map((jar, index) => (
              <SelectableJar
                key={index}
                name={jar.name}
                color={jar.color}
                totalBalance={jar.balanceSummary.calculatedTotalBalanceInSats}
                availableBalance={jar.balanceSummary.calculatedAvailableBalanceInSats}
                frozenOrLockedBalance={jar.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
                totalWalletBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
                isSelected={selectedJar === jar}
                onClick={() => setSelectedJar(jar)}
                disabled={disabledJars.includes(jar)}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="gap-3 sm:justify-center">
          <Button className="min-h-12 flex-1 text-base" variant="outline" size="xxl" onClick={handleClose}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button
            className="min-h-12 flex-1 text-base"
            size="xxl"
            onClick={() => void confirm()}
            disabled={!selectedJar || isConfirming}
          >
            {isConfirming ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('modal.confirm_button_accept')}
              </>
            ) : (
              <>{t('modal.confirm_button_accept')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
