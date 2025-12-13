import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cx } from 'class-variance-authority'
import { EyeIcon, EyeOffIcon, AlertTriangleIcon, ClockIcon, Loader2Icon, CopyIcon, CheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { jarTemplates } from '@/components/layout/display-mode-context'
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
import { Separator } from '@/components/ui/separator'
import { JAM_SEED_MODAL_TIMEOUT } from '@/constants/jam'
import { useApiClient } from '@/hooks/useApiClient'
import { hashPassword } from '@/lib/hash'
import { displaywalletOptions } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { authStore } from '@/store/authStore'

interface AccountXpubsDialogProps {
  walletFileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface XpubInfo {
  account: string
  flavorName: string
  flavorColor: string | null
  externalXpub: string | null
  internalXpub: string | null
}

export const AccountXpubsDialog = ({ walletFileName, open, onOpenChange }: AccountXpubsDialogProps) => {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordVerifiedAt, setPasswordVerifiedAt] = useState<number>()
  const isPasswordVerified = useMemo(() => passwordVerifiedAt !== undefined, [passwordVerifiedAt])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const [timeLeft, setTimeLeft] = useState(JAM_SEED_MODAL_TIMEOUT)
  const secondsLeft = useMemo(() => Math.max(0, Math.round(timeLeft / 1_000)), [timeLeft])
  const [copiedXpub, setCopiedXpub] = useState<string | null>(null)

  const client = useApiClient()
  const authState = useStore(authStore, (state) => state.state)

  const displayQuery = useQuery({
    ...displaywalletOptions({
      client,
      path: { walletname: walletFileName },
    }),
    staleTime: 1,
    gcTime: 1,
    enabled: false,
    retry: false,
  })

  const xpubsData = useMemo<XpubInfo[]>(() => {
    if (!displayQuery.data?.walletinfo?.accounts) return []

    return displayQuery.data.walletinfo.accounts.map((account) => {
      const accountNumber = account.account || '0'
      const accountIndex = parseInt(accountNumber)
      const flavor = accountIndex < jarTemplates.length ? jarTemplates[accountIndex] : null
      const flavorName = flavor ? flavor.name : `Account ${accountNumber}`

      let externalXpub: string | null = null
      let internalXpub: string | null = null

      account.branches?.forEach((branch) => {
        if (!branch.branch) return

        // Branch strings are unstructured and can look like:
        // "external addresses m/84'/1'/0'/0 tpubDEpN..."
        // or sometimes the xpub may be the last token. We should pick the token that looks like an extended pub (xpub/tpub/zpub/ypub)
        const tokens = branch.branch.trim().split(/\s+/)
        const pubToken = tokens.find((tok) => /pub$/i.test(tok)) || tokens[tokens.length - 1]

        // Helper to assign found pub if it looks like an extended pub
        const assignIfPub = (tok: string | undefined, target: 'external' | 'internal') => {
          if (!tok) return
          if (!/^(?:[txzyp]pub)/i.test(tok) && !/pub$/i.test(tok)) return
          if (target === 'external') externalXpub = tok
          else internalXpub = tok
        }

        if (branch.branch.includes('external addresses')) {
          assignIfPub(pubToken, 'external')
        } else if (branch.branch.includes('internal addresses')) {
          // internal branch may contain xpub for some internal branches
          assignIfPub(pubToken, 'internal')
        }
      })

      return {
        account: accountNumber,
        flavorName,
        flavorColor: flavor?.color || null,
        externalXpub,
        internalXpub,
      }
    })
  }, [displayQuery.data])

  const displayQueryRefetch = useMemo(() => displayQuery.refetch, [displayQuery.refetch])

  useEffect(() => {
    if (open && isPasswordVerified && !displayQuery.data) {
      displayQueryRefetch()
    }
  }, [open, isPasswordVerified, displayQuery.data, displayQueryRefetch])

  useEffect(() => {
    if (passwordVerifiedAt === undefined) {
      setTimeLeft(0)
      return
    }
    setTimeLeft(JAM_SEED_MODAL_TIMEOUT)

    const dataDisplayedAt = Math.max(displayQuery.dataUpdatedAt, passwordVerifiedAt)
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, dataDisplayedAt + JAM_SEED_MODAL_TIMEOUT - Date.now()))
    }, 333)

    return () => {
      clearInterval(interval)
    }
  }, [displayQuery.dataUpdatedAt, passwordVerifiedAt])

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
      setError('Session error. Please login again.')
      return
    }

    if (!authState?.hashed_password) {
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
    setCopiedXpub(null)
    onOpenChange(false)
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password && !isPasswordVerified) {
      await handlePasswordSubmit()
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedXpub(text)
      toast.success(t('settings.xpubs_modal.copied_to_clipboard'))
      setTimeout(() => setCopiedXpub(null), 2000)
    } catch (error) {
      toast.error(t('settings.xpubs_modal.failed_to_copy'))
      console.error('Copy failed:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {!isPasswordVerified ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                {t('settings.seed_modal.verification.title')}
              </DialogTitle>
              <DialogDescription>{t('settings.xpubs_modal.verification_subtitle')}</DialogDescription>
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
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
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
                <span>{t('settings.xpubs_modal.title')}</span>
              </DialogTitle>
              <DialogDescription>{t('settings.xpubs_modal.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {displayQuery.isFetching ? (
                <div className="text-muted-foreground flex items-center justify-center gap-1 py-8">
                  <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
                  {t('global.loading')}
                </div>
              ) : displayQuery.error ? (
                <div className="light:border-red-800 light:bg-red-50 rounded-lg border border-red-200 bg-red-900/20 p-2">
                  <div className="flex items-start gap-2">
                    <div className="light:text-red-800 text-sm text-red-200">
                      <div className="flex items-center">
                        <AlertTriangleIcon className="light:text-red-800 m-1 h-4 w-4 shrink-0 text-red-200" />
                        <p className="text-md font-medium">{t('settings.xpubs_modal.error_loading_xpubs')}</p>
                      </div>
                      <p className="p-1 text-xs">{displayQuery.error.message || t('global.errors.reason_unknown')}</p>
                    </div>
                  </div>
                </div>
              ) : xpubsData.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {xpubsData
                      .filter((xpubInfo) => xpubInfo.externalXpub || xpubInfo.internalXpub)
                      .map((xpubInfo) => (
                        <div key={xpubInfo.account} className="bg-muted rounded-lg p-4">
                          <div className="mb-3 flex items-center gap-3">
                            {xpubInfo.flavorColor && (
                              <div
                                className="h-6 w-6 shrink-0 rounded-full border-2 border-white shadow-sm dark:border-gray-800"
                                style={{ backgroundColor: xpubInfo.flavorColor }}
                              />
                            )}
                            <div className="flex items-baseline gap-2">
                              <h3 className="text-lg font-semibold">{xpubInfo.flavorName}</h3>
                              <span className="text-muted-foreground text-sm">
                                ({t('settings.xpubs_modal.account_label')} {xpubInfo.account})
                              </span>
                            </div>
                          </div>

                          {/* External xpub */}
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs font-medium">
                              {t('settings.xpubs_modal.external_addresses_label')}
                            </Label>
                            {xpubInfo.externalXpub ? (
                              <div className="flex items-center gap-2">
                                <div className="bg-background flex-1 rounded border p-2">
                                  <code className="text-xs break-all">{xpubInfo.externalXpub}</code>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => copyToClipboard(xpubInfo.externalXpub!)}
                                  className="shrink-0"
                                >
                                  {copiedXpub === xpubInfo.externalXpub ? (
                                    <CheckIcon className="h-4 w-4" />
                                  ) : (
                                    <CopyIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs italic">
                                {t('settings.xpubs_modal.no_xpub_available')}
                              </p>
                            )}
                          </div>

                          {/* Internal xpub (branch 2) */}
                          <Separator className="my-3" />
                          <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs font-medium">
                              {t('settings.xpubs_modal.internal_addresses_label')}
                            </Label>
                            {xpubInfo.internalXpub ? (
                              <div className="flex items-center gap-2">
                                <div className="bg-background flex-1 rounded border p-2">
                                  <code className="text-xs break-all">{xpubInfo.internalXpub}</code>
                                </div>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => copyToClipboard(xpubInfo.internalXpub!)}
                                  className="shrink-0"
                                >
                                  {copiedXpub === xpubInfo.internalXpub ? (
                                    <CheckIcon className="h-4 w-4" />
                                  ) : (
                                    <CopyIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs italic">
                                {t('settings.xpubs_modal.no_xpub_available')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {xpubsData.filter((x) => x.externalXpub || x.internalXpub).length === 0 ? (
                    <div className="text-muted-foreground py-4 text-center">
                      {t('settings.xpubs_modal.no_accounts_found')}
                    </div>
                  ) : (
                    <div className="light:border-yellow-800 light:bg-yellow-50 rounded-lg border border-yellow-200 bg-yellow-900/20 p-2">
                      <div className="flex items-start gap-2">
                        <div className="light:text-yellow-800 text-sm text-yellow-200">
                          <div className="flex items-center">
                            <AlertTriangleIcon className="light:text-yellow-500 m-1 h-4 w-4 shrink-0 text-yellow-200" />
                            <p className="text-md font-medium">{t('settings.xpubs_modal.text_warning_title')}</p>
                          </div>
                          <p className="p-1 text-xs">{t('settings.xpubs_modal.text_warning_message')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground text-center">{t('settings.xpubs_modal.no_accounts_found')}</div>
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
