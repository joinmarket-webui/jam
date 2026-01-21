import { useState, useEffect, useMemo, type ComponentProps } from 'react'
import { getseedOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cx } from 'class-variance-authority'
import { EyeIcon, EyeOffIcon, AlertTriangleIcon, ClockIcon } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { JAM_SEED_MODAL_TIMEOUT } from '@/constants/jam'
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import type { WalletFileName } from '@/lib/utils'
import type { SeedPhrase, WithRequiredProperty } from '@/types/global'
import { SeedPhraseGrid } from '../ui/jam/SeedPhraseGrid'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'

type SeedPhraseDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
  hashedPassword: string
}

// TODO: use react-hook-form and yup schema
export const SeedPhraseDialog = ({ open, onOpenChange, walletFileName, hashedPassword }: SeedPhraseDialogProps) => {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordVerifiedAt, setPasswordVerifiedAt] = useState<number>()
  const isPasswordVerified = useMemo(() => passwordVerifiedAt !== undefined, [passwordVerifiedAt])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordVerificationError, setPasswordVerificationError] = useState<string>()
  const [timeLeft, setTimeLeft] = useState(JAM_SEED_MODAL_TIMEOUT)
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
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: false,
    retry: false,
    select: (data) => data.seedphrase.split(/\s+/) as SeedPhrase,
  })

  useEffect(() => {
    if (open && isPasswordVerified && seedQuery.data === undefined) {
      seedQuery.refetch()
    }
  }, [open, isPasswordVerified, seedQuery])

  useEffect(() => {
    if (passwordVerifiedAt === undefined) {
      setTimeLeft(0)
      return
    }
    setTimeLeft(JAM_SEED_MODAL_TIMEOUT)

    const seedDisplayedAt = Math.max(seedQuery.dataUpdatedAt, passwordVerifiedAt)
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, seedDisplayedAt + JAM_SEED_MODAL_TIMEOUT - Date.now()))
    }, 333)

    return () => {
      clearInterval(interval)
    }
  }, [seedQuery.dataUpdatedAt, passwordVerifiedAt])

  useEffect(() => {
    if (timeLeft <= 0) {
      setPassword('')
      setPasswordVerifiedAt(undefined)
      setShowPassword(false)
      setRevealSeed(false)
      setPasswordVerificationError(undefined)
    }
  }, [timeLeft])

  const handlePasswordSubmit = () => {
    if (!password) return

    setIsSubmitting(true)
    setTimeout(async () => {
      try {
        const hashed = await hashPassword(password, walletFileName)
        if (hashed === hashedPassword) {
          setPassword('')
          setPasswordVerifiedAt(Date.now())
          setPasswordVerificationError(undefined)
        } else {
          setPasswordVerificationError(t('settings.seed_modal.verification.text_error_password_incorrect'))
        }
      } catch (error) {
        const reason = (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown')
        setPasswordVerificationError(t('settings.seed_modal.verification.text_error', { reason }))
        console.error('Password verification error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }, 4)
  }

  const handleClose = () => {
    onOpenChange(false)
    setPassword('')
    setPasswordVerifiedAt(undefined)
    setPasswordVerificationError(undefined)
    setShowPassword(false)
    setTimeLeft(JAM_SEED_MODAL_TIMEOUT)
    setRevealSeed(false)
    queryClient.removeQueries({ queryKey: seedQueryOptions.queryKey })
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password && !isPasswordVerified) {
      await handlePasswordSubmit()
    }
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('settings.seed_modal.verification.label_password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('settings.seed_modal.verification.placeholder_password')}
                    className={passwordVerificationError ? 'border-destructive' : undefined}
                  />
                  <Button
                    tabIndex={-1}
                    type="button"
                    variant="link"
                    size="icon"
                    className="absolute top-1/2 right-0 -translate-y-1/2 transform"
                    onClick={() => setShowPassword((val) => !val)}
                  >
                    {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                  </Button>
                </div>
                {passwordVerificationError && <p className="text-destructive text-sm">{passwordVerificationError}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('global.cancel')}
              </Button>
              <Button type="submit" onClick={handlePasswordSubmit} disabled={!password || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner className="motion-reduce:hidden" />
                    {t('settings.seed_modal.verification.text_button_submitting')}
                  </>
                ) : (
                  t('settings.seed_modal.verification.text_button_submit')
                )}
              </Button>
            </DialogFooter>
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
                    disabled={!seedQuery.data || !seedQuery.isFetching}
                  />
                  <Label htmlFor="switch-reveal-seed">{t('settings.reveal_seed')}</Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <div className="flex w-full items-center justify-between">
                <div
                  className={cx('text-muted-foreground flex items-center gap-1 text-sm', {
                    'light:text-red-600 animate-pulse text-red-800': secondsLeft <= 10,
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
