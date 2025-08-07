import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, AlertTriangle, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import { getseedOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { getSession } from '@/lib/session'

interface SeedPhraseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SeedPhraseDialog = ({ open, onOpenChange }: SeedPhraseDialogProps) => {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPasswordVerified, setIsPasswordVerified] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)

  const client = useApiClient()
  const session = getSession()
  const walletFileName = session?.walletFileName

  const {
    data: seedPhraseData,
    isLoading: isSeedLoading,
    isError: isSeedError,
    error: seedError,
    refetch: refetchSeedPhrase,
  } = useQuery({
    ...getseedOptions({
      client,
      path: { walletname: walletFileName! },
    }),
    enabled: isPasswordVerified && !!password && !!walletFileName && open,
    staleTime: 0,
    retry: false,
    select: (data) => {
      return data.seedphrase
    },
  })

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isPasswordVerified && open) {
      // Reset timer when seed phrase is shown
      setTimeLeft(30)
      refetchSeedPhrase()

      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsPasswordVerified(false)
            setPassword('')
            setError('')
            return 30
          }
          return prevTime - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPasswordVerified, open])

  const handlePasswordSubmit = () => {
    if (!password) return
    if (!walletFileName) {
      setError('Session error. Please login again.')
      return
    }

    // Check if hash verification is available
    if (!session?.hashedSecret) {
      setError('Password verification unavailable. Please login again.')
      return
    }

    try {
      const hashed = hashPassword(password, walletFileName)
      if (hashed === session.hashedSecret) {
        setIsPasswordVerified(true)
        setError('')
      } else {
        setError(t('settings.seed_modal_incorrect_password'))
      }
    } catch (error) {
      setError('Error verifying password.')
      console.error('Password verification error:', error)
    }
  }

  const handleClose = () => {
    setPassword('')
    setIsPasswordVerified(false)
    setError('')
    setShowPassword(false)
    setTimeLeft(30)
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
                {t('settings.seed_modal_title')}
              </DialogTitle>
              <DialogDescription>{t('settings.seed_modal_password_description')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('settings.seed_modal_password_label')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('settings.seed_modal_password_placeholder')}
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
              <Button onClick={handlePasswordSubmit} disabled={!password}>
                {t('settings.seed_modal_verify_button')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <span className="flex items-center gap-2">{t('settings.seed_modal_seed_title')}</span>
              </DialogTitle>
              <DialogDescription>{t('settings.seed_modal_info_text')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted min-h-[80px] rounded-lg p-4 px-7">
                {isSeedLoading ? (
                  <div className="text-muted-foreground text-center">{t('global.loading')}</div>
                ) : isSeedError ? (
                  <div className="text-destructive text-center text-sm">
                    {t('settings.seed_modal_error')}
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
                  <div className="text-muted-foreground text-center">{t('settings.seed_modal_no_data')}</div>
                )}
              </div>

              <div className="light:border-yellow-800 light:bg-yellow-50 rounded-lg border border-yellow-200 bg-yellow-900/20 p-2">
                <div className="flex items-start gap-2">
                  <div className="light:text-yellow-800 text-sm text-yellow-200">
                    <div className="flex items-center">
                      <AlertTriangle className="light:text-yellow-500 m-1 h-4 w-4 shrink-0 text-yellow-200" />
                      <p className="text-md font-medium">{t('settings.seed_modal_warning_title')}</p>
                    </div>
                    <p className="p-1 text-xs">{t('settings.seed_modal_warning_message')}</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="w-f flex w-full justify-between">
                <div className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Clock className={`h-4 w-4 ${timeLeft <= 10 && 'animate-pulse text-red-600'}`} />
                  <span>{timeLeft}s</span>
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
