import { useState, useEffect, useMemo, type ComponentProps } from 'react'
import { getseedOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cx } from 'class-variance-authority'
import { AlertTriangleIcon, ClockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useApiClient } from '@/hooks/useApiClient'
import type { WalletFileName } from '@/lib/utils'
import type { Milliseconds, SeedPhrase, WithRequiredProperty } from '@/types/global'
import { SeedPhraseGrid } from '../ui/jam/SeedPhraseGrid'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'
import { PasswordVerificationForm } from '../utils/PasswordVerificationForm'

type SeedPhraseDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
  hashedPassword: string
  autoCloseTimeout: Milliseconds
}

// TODO: use react-hook-form and yup schema
export const SeedPhraseDialog = ({
  open,
  onOpenChange,
  walletFileName,
  hashedPassword,
  autoCloseTimeout,
}: SeedPhraseDialogProps) => {
  const { t } = useTranslation()

  const [passwordVerifiedAt, setPasswordVerifiedAt] = useState<number>()
  const isPasswordVerified = useMemo(() => passwordVerifiedAt !== undefined, [passwordVerifiedAt])
  const [timeLeft, setTimeLeft] = useState(autoCloseTimeout)

  if (timeLeft <= 0 && passwordVerifiedAt !== undefined) {
    setPasswordVerifiedAt(undefined)
  }

  const secondsLeft = useMemo(() => Math.max(0, Math.round(timeLeft / 1_000)), [timeLeft])

  const [revealSeed, setRevealSeed] = useState(false)

  const queryClient = useQueryClient()
  const client = useApiClient()

  const seedQueryOptions = getseedOptions({
    client,
    path: { walletname: encodeURIComponent(walletFileName) },
  })

  const seedQuery = useQuery({
    ...seedQueryOptions,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    enabled: false,
    retry: false,
    select: (data) => data.seedphrase.split(/\s+/) as SeedPhrase,
  })

  useEffect(() => {
    if (open && isPasswordVerified && seedQuery.data === undefined) {
      void seedQuery.refetch()
    }
  }, [open, isPasswordVerified, seedQuery])

  useEffect(() => {
    if (passwordVerifiedAt === undefined) return

    const seedDisplayedAt = Math.max(seedQuery.dataUpdatedAt, passwordVerifiedAt)
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, seedDisplayedAt + autoCloseTimeout - Date.now()))
    }, 333)

    return () => {
      clearInterval(interval)
    }
  }, [seedQuery.dataUpdatedAt, passwordVerifiedAt, autoCloseTimeout])

  const handleClose = () => {
    onOpenChange(false)
    setPasswordVerifiedAt(undefined)
    setTimeLeft(autoCloseTimeout)
    setRevealSeed(false)
    queryClient.removeQueries({ queryKey: seedQueryOptions.queryKey })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        {!isPasswordVerified ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                {t('settings.seed_modal.verification.title')}
              </DialogTitle>
              <DialogDescription>{t('settings.seed_modal.verification.subtitle')}</DialogDescription>
            </DialogHeader>

            <PasswordVerificationForm
              walletFileName={walletFileName}
              hashedPassword={hashedPassword}
              onSubmit={() => {
                setTimeLeft(autoCloseTimeout)
                setPasswordVerifiedAt(Date.now())
              }}
              onCancel={handleClose}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <span className="flex items-center gap-2">{t('settings.seed_modal.title')}</span>
              </DialogTitle>
              <DialogDescription>{t('settings.seed_modal.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {!seedQuery.error && (
                <div className="bg-muted rounded-lg p-4">
                  {seedQuery.isFetching ? (
                    <div className="text-muted-foreground flex items-center justify-center gap-2">
                      <Spinner className="motion-reduce:hidden" />
                      {t('global.loading')}
                    </div>
                  ) : seedQuery.data ? (
                    <SeedPhraseGrid className="md:grid-cols-3" value={seedQuery.data} masked={!revealSeed} />
                  ) : (
                    <div className="text-muted-foreground text-center">
                      {t('settings.seed_modal.text_error_no_data')}
                    </div>
                  )}
                </div>
              )}

              {!seedQuery.isFetching && seedQuery.error && (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>{t('settings.seed_modal.text_error_title')}</AlertTitle>
                  <AlertDescription>{seedQuery.error.message || t('global.errors.reason_unknown')}</AlertDescription>
                </Alert>
              )}

              {!seedQuery.isFetching && seedQuery.data && (
                <Alert variant="warning">
                  <AlertTriangleIcon />
                  <AlertTitle>{t('settings.seed_modal.text_warning_title')}</AlertTitle>
                  <AlertDescription>{t('settings.seed_modal.text_warning_message')}</AlertDescription>
                </Alert>
              )}
              {!seedQuery.error && (
                <div className="flex justify-center gap-2">
                  <Switch
                    id="switch-reveal-seed"
                    checked={revealSeed}
                    onCheckedChange={(checked) => setRevealSeed(checked)}
                    disabled={!seedQuery.data || seedQuery.isFetching}
                  />
                  <Label htmlFor="switch-reveal-seed">{t('settings.reveal_seed')}</Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <div className="flex w-full items-center justify-between">
                <div
                  className={cx('text-muted-foreground flex items-center gap-1 text-sm', {
                    'text-destructive! animate-pulse': secondsLeft <= 10,
                  })}
                >
                  <ClockIcon className="h-4 w-4" />
                  <span
                    className={cx('mt-0.5 font-mono', {
                      hidden: secondsLeft < 1,
                    })}
                  >
                    {secondsLeft}s
                  </span>
                </div>
                <Button variant="outline" onClick={handleClose}>
                  {t('global.close')}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
