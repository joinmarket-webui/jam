import { useMemo, type ComponentProps } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { Jar } from '@/context/JamWalletInfoContext'
import type { BalanceSummary } from '@/lib/balanceSummary'
import type { JarIndex, WithRequiredProperty } from '@/types/global'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from '../ui/dialog'
import { SelectableJar } from '../ui/jam/SelectableJar'
import { Spinner } from '../ui/spinner'
import { createJarSelectorDialogFormSchema, type JarSelectorDialogFormValues } from './JarSelectorDialog.schema'

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

  const selectableJarIndexes = useMemo(
    () => jars.filter((jar) => !disabledJars.includes(jar)).map((jar) => jar.jarIndex),
    [disabledJars, jars],
  )
  const schema = useMemo(() => createJarSelectorDialogFormSchema(selectableJarIndexes), [selectableJarIndexes])
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = useForm<JarSelectorDialogFormValues>({
    mode: 'onChange',
    defaultValues: {
      jarIndex: undefined,
    },
    resolver: yupResolver(schema),
  })
  const selectedJarIndex = useWatch({ control, name: 'jarIndex' })
  const selectedJar = jars.find((jar) => jar.jarIndex === selectedJarIndex)
  const canConfirm =
    selectedJarIndex !== undefined && selectedJar !== undefined && selectableJarIndexes.includes(selectedJarIndex)

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  const doOnSubmit = handleSubmit(async ({ jarIndex }) => {
    await onConfirm(jarIndex)
    reset()
  })

  return (
    <Dialog open={open} onOpenChange={handleClose} {...dialogProps}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={(event) => void doOnSubmit(event)} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
            {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
          </DialogHeader>

          <div className="py-4">
            <div className="flex flex-1 flex-row flex-wrap items-center justify-center gap-2 gap-y-4">
              {jars.map((jar) => (
                <SelectableJar
                  key={jar.jarIndex}
                  name={jar.name}
                  color={jar.color}
                  totalBalance={jar.balanceSummary.calculatedTotalBalanceInSats}
                  availableBalance={jar.balanceSummary.calculatedAvailableBalanceInSats}
                  frozenOrLockedBalance={jar.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
                  totalWalletBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
                  isSelected={selectedJarIndex === jar.jarIndex}
                  onClick={() =>
                    setValue('jarIndex', jar.jarIndex, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                  disabled={disabledJars.includes(jar)}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-3 sm:justify-center">
            <Button
              type="button"
              className="min-h-12 flex-1 text-base"
              variant="outline"
              size="xxl"
              onClick={handleClose}
            >
              {t('modal.confirm_button_reject')}
            </Button>
            <Button
              type="submit"
              className="min-h-12 flex-1 text-base"
              size="xxl"
              disabled={!canConfirm || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="motion-reduce:hidden" />
                  {t('modal.confirm_button_accept')}
                </>
              ) : (
                <>{t('modal.confirm_button_accept')}</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
