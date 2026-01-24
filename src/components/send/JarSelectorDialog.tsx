import { useState, type ComponentProps } from 'react'
import { DialogTitle } from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { BalanceSummary } from '@/lib/balanceSummary'
import type { JarIndex, WithRequiredProperty } from '@/types/global'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '../ui/dialog'
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
}: JarSelectorDialogProps) {
  const { t } = useTranslation()

  const [isConfirming, setIsConfirming] = useState(false)
  const [selectedJar, setSelectedJar] = useState<Jar>()

  const handleClose = () => {
    setSelectedJar(undefined)
    onOpenChange(false)
  }

  const confirm = () => {
    if (selectedJar === undefined) return

    setIsConfirming(true)
    onConfirm(selectedJar.jarIndex)
      .then(() => setSelectedJar(undefined))
      .finally(() => setIsConfirming(false))
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-4">
            {jars.map((jar, index) => (
              <SelectableJar
                key={index}
                name={jar.name}
                color={jar.color}
                balance={jar.balanceSummary.calculatedTotalBalanceInSats}
                totalBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
                isSelected={selectedJar === jar}
                onClick={() => setSelectedJar(jar)}
                disabled={disabledJars.includes(jar)}
              />
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('modal.confirm_button_reject')}
          </Button>
          <Button onClick={confirm} disabled={!selectedJar || isConfirming}>
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
