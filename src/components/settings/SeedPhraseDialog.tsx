import { useState, useEffect, useMemo } from 'react'
import { getseedOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cx } from 'class-variance-authority'
import { EyeIcon, EyeOffIcon, AlertTriangleIcon, ClockIcon, Loader2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
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
import { authStore } from '@/store/authStore'
import { SeedPhraseGrid } from '../ui/jam/SeedPhraseGrid'

interface SeedPhraseDialogProps {
  walletFileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// TODO: use react-hook-form and yup schema
export const SeedPhraseDialog = ({ walletFileName, open, onOpenChange }: SeedPhraseDialogProps) => {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordVerifiedAt, setPasswordVerifiedAt] = useState<number>()
  const isPasswordVerified = useMemo(() => passwordVerifiedAt !== undefined, [passwordVerifiedAt])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [timeLeft, setTimeLeft] = useState(JAM_SEED_MODAL_TIMEOUT)
  const secondsLeft = useMemo(() => Math.max(0, Math.round(timeLeft / 1_000)), [timeLeft])

  const queryClient = useQueryClient()
  const client = useApiClient()
  const authState = useStore(authStore, (state) => state.state)

  const seedQueryOptions = getseedOptions({
    client,
    path: { walletname: encodeURIComponent(walletFileName) },
  })

  const seedQuery = useQuery({
    ...seedQueryOptions,
    staleTime: 1,
    gcTime: 1,
    enabled: false,
    retry: false,
    select: (data) => data.seedphrase,
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
      setError(undefined)
    }
  }, [timeLeft])

  const handlePasswordSubmit = async () => {
    if (!password) return
    if (walletFileName !== authState?.walletFileName) {
      // TODO: Needs translation?
      setError('Session error. Please login again.')
      return
    }

    // Check if hash verification is available
    if (!authState?.hashed_password) {
      // TODO: Needs translation?
      setError('Password verification unavailable. Please login again.')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      try {
        const hashed = hashPassword(password, walletFileName)
        if (hashed === authState?.hashed_password) {
          setPasswordVerifiedAt(Date.now())
          setError(undefined)
        } else {
          setError(t('settings.seed_modal.verification.text_error_password_incorrect'))
        }
      } catch (error) {
        setError(t('settings.seed_modal.verification.text_error'))
        console.error('Password verification error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }, 4)
  }

  const handleClose = () => {
    setPassword('')
    setPasswordVerifiedAt(undefined)
    setError(undefined)
    setShowPassword(false)
    setTimeLeft(JAM_SEED_MODAL_TIMEOUT)
    onOpenChange(false)
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
                    className={error ? 'border-destructive' : undefined}
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
                {error && <p className="text-destructive text-sm">{error}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('global.cancel')}
              </Button>
              <Button type="submit" onClick={handlePasswordSubmit} disabled={!password || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
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
                    <div className="text-muted-foreground flex items-center justify-center gap-1">
                      <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
                      {t('global.loading')}
                    </div>
                  ) : seedQuery.data ? (
                    <SeedPhraseGrid value={seedQuery.data.split(/\s+/)} className="md:grid-cols-3" />
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
