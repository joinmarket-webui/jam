import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cx } from 'class-variance-authority'
import { Eye, EyeOff, AlertTriangle, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
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
import { getseedOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { authStore } from '@/store/authStore'

interface SeedPhraseDialogProps {
  walletFileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SeedPhraseDialog = ({ walletFileName, open, onOpenChange }: SeedPhraseDialogProps) => {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordVerifiedAt, setPasswordVerifiedAt] = useState<number>()
  const isPasswordVerified = useMemo(() => passwordVerifiedAt !== undefined, [passwordVerifiedAt])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [timeLeft, setTimeLeft] = useState(JAM_SEED_MODAL_TIMEOUT)

  const client = useApiClient()
  const authState = useStore(authStore, (state) => state.state)

  const {
    data: seedPhraseData,
    isLoading: isSeedLoading,
    isError: isSeedError,
    error: seedError,
    dataUpdatedAt: seedUpadtedAt,
    refetch: refetchSeedPhrase,
  } = useQuery({
    ...getseedOptions({
      client,
      path: { walletname: walletFileName },
    }),
    staleTime: 0,
    enabled: false,
    retry: false,
    select: (data) => data.seedphrase,
  })

  useEffect(() => {
    if (isPasswordVerified && open) {
      refetchSeedPhrase()
    }
  }, [isPasswordVerified, open, refetchSeedPhrase])

  useEffect(() => {
    if (passwordVerifiedAt === undefined) {
      setTimeLeft(0)
      return
    }
    setTimeLeft(JAM_SEED_MODAL_TIMEOUT)

    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, seedUpadtedAt + JAM_SEED_MODAL_TIMEOUT - Date.now()))
    }, 333)

    return () => {
      clearInterval(interval)
    }
  }, [seedUpadtedAt, passwordVerifiedAt])

  useEffect(() => {
    if (timeLeft < 0) {
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
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
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
                    className={error ? 'border-destructive' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('global.cancel')}
              </Button>
              <Button onClick={handlePasswordSubmit} disabled={!password || isSubmitting}>
                {isSubmitting
                  ? t('settings.seed_modal.verification.text_button_submitting')
                  : t('settings.seed_modal.verification.text_button_submit')}
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
              <div className="bg-muted min-h-[80px] rounded-lg p-4 px-7">
                {isSeedLoading ? (
                  <div className="text-muted-foreground text-center">{t('global.loading')}</div>
                ) : isSeedError ? (
                  <div className="text-destructive text-center text-sm">
                    {t('settings.seed_modal.text_error')}
                    {seedError &&
                      (typeof seedError === 'object' && 'message' in seedError ? `: ${seedError.message}` : '')}
                  </div>
                ) : seedPhraseData ? (
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {seedPhraseData.split(/\s+/).map((word: string, index: number) => (
                      <div key={index} className="light:bg-white flex items-center gap-2 border bg-zinc-700 p-2">
                        <span className="text-muted-foreground w-4 text-xs">{index + 1}.</span>
                        <span className="font-mono">{word}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center">{t('settings.seed_modal.text_error_no_data')}</div>
                )}
              </div>

              <div className="light:border-yellow-800 light:bg-yellow-50 rounded-lg border border-yellow-200 bg-yellow-900/20 p-2">
                <div className="flex items-start gap-2">
                  <div className="light:text-yellow-800 text-sm text-yellow-200">
                    <div className="flex items-center">
                      <AlertTriangle className="light:text-yellow-500 m-1 h-4 w-4 shrink-0 text-yellow-200" />
                      <p className="text-md font-medium">{t('settings.seed_modal.text_warning_title')}</p>
                    </div>
                    <p className="p-1 text-xs">{t('settings.seed_modal.text_warning_message')}</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="w-f flex w-full justify-between">
                <div className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Clock
                    className={cx('h-4 w-4', {
                      'animate-pulse text-red-600': timeLeft <= 10_000,
                    })}
                  />
                  <span>{Math.round(timeLeft / 1_000)}s</span>
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
