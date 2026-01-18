import { useState, useEffect, useMemo, useCallback } from 'react'
import { getseedOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { mnemonicToSeed } from '@scure/bip39'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Network } from 'bitcoin-address-validation'
import { EyeIcon, EyeOffIcon, AlertTriangleIcon, ClockIcon, Loader2Icon, CopyIcon, CheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
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
import { useJars, type Jar } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { deriveAccountXpub, detectNetwork } from '@/lib/bip32'
import { hashPassword } from '@/lib/hash'
import { cn } from '@/lib/utils'
import { convertExtendedPublicKey } from '@/lib/xpubs'
import { authStore } from '@/store/authStore'
import type { JarIndex } from '@/types/global'

const HD_PATH_PURPOSE: number = 84

type Xpub = {
  name: string
  network: Network
  path: string
  xpub: string
}

interface AccountXpubInfo {
  accountIndex: JarIndex
  accountName: string
  path: string
  xpubs: Xpub[]
}

/**
 * Derive account-level xpubs from seed phrase
 * This derives the correct BIP84 account-level xpubs: m/84'/coin_type'/account'
 * not the child xpubs that the API incorrectly returns
 */
async function deriveAccountXpubsFromSeed(
  seedPhrase: string,
  network: Network,
  jars: Jar[],
): Promise<AccountXpubInfo[]> {
  const coinType = network === Network.mainnet ? 0 : 1

  const seed = await mnemonicToSeed(seedPhrase)

  // Convert to native segwit format (zpub/vpub) and build account info
  const accounts: AccountXpubInfo[] = []
  for (let i = 0; i < jars.length; i++) {
    const jar = jars[i]

    const path = `m/${HD_PATH_PURPOSE}'/${coinType}'/${jar.jarIndex}'`
    const xpub = deriveAccountXpub(seed, path)

    const xpubs = []

    if (HD_PATH_PURPOSE !== 84) {
      xpubs.push({
        name: 'xpub',
        path,
        network,
        xpub: xpub,
      })
    } else {
      xpubs.push({
        name: 'zpub',
        path,
        network,
        xpub: convertExtendedPublicKey(xpub, 'zpub'),
      })
    }

    accounts.push({
      accountIndex: jar.jarIndex,
      accountName: jar.name,
      path,
      xpubs: xpubs,
    })
  }

  return accounts
}

interface AccountXpubsDialogProps {
  walletFileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
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
  const [accountXpubs, setAccountXpubs] = useState<AccountXpubInfo[]>([])
  const [copiedXpub, setCopiedXpub] = useState<string | null>(null)

  const client = useApiClient()
  const authState = useStore(authStore, (state) => state.state)
  const queryClient = useQueryClient()
  const { jars } = useJars()

  const seedQuery = useQuery({
    ...getseedOptions({
      client,
      path: { walletname: walletFileName },
    }),
    staleTime: 1,
    gcTime: 1,
    enabled: false,
    retry: false,
  })

  const seedRefetch = useMemo(() => seedQuery.refetch, [seedQuery.refetch])

  // Fetch seed phrase immediately after password verification
  useEffect(() => {
    if (open && isPasswordVerified) {
      seedRefetch()
    }
  }, [open, isPasswordVerified, seedRefetch])

  // Derive xpubs when seed data is available
  useEffect(() => {
    if (seedQuery.data?.seedphrase !== undefined) {
      // Detect network from wallet name
      const network = detectNetwork(walletFileName)
      deriveAccountXpubsFromSeed(seedQuery.data.seedphrase, network, jars).then(setAccountXpubs)
    }
  }, [seedQuery.data, walletFileName, jars])

  useEffect(() => {
    if (passwordVerifiedAt === undefined) {
      setTimeLeft(0)
      return
    }
    setTimeLeft(JAM_SEED_MODAL_TIMEOUT)

    const xpubsDisplayedAt = Math.max(seedQuery.dataUpdatedAt, passwordVerifiedAt)
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, xpubsDisplayedAt + JAM_SEED_MODAL_TIMEOUT - Date.now()))
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
      setAccountXpubs([])
      setShowPassword(false)
      setCopiedXpub(null)
    }
  }, [timeLeft])

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedXpub(text)
        toast.success(t('settings.xpubs_modal.text_copied'))
        setTimeout(() => setCopiedXpub(null), 2000)
      } catch {
        toast.error(t('settings.xpubs_modal.text_copy_failed'))
      }
    },
    [t],
  )

  const handlePasswordSubmit = async () => {
    if (!password) return
    if (walletFileName !== authState?.walletFileName) {
      setError(t('settings.xpubs_modal.verification.text_session_error'))
      return
    }

    if (!authState?.hashed_password) {
      setError(t('settings.xpubs_modal.verification.text_unavailable'))
      return
    }

    setIsSubmitting(true)
    try {
      const hashed = hashPassword(password, walletFileName)
      if (hashed === authState?.hashed_password) {
        setPasswordVerifiedAt(Date.now())
        setError(undefined)
      } else {
        setError(t('settings.xpubs_modal.verification.text_error_password_incorrect'))
      }
    } catch (error) {
      setError(t('settings.xpubs_modal.verification.text_error'))
      console.error('Password verification error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setPasswordVerifiedAt(undefined)
    setError(undefined)
    setShowPassword(false)
    setTimeLeft(JAM_SEED_MODAL_TIMEOUT)
    setAccountXpubs([])
    setCopiedXpub(null)
    // Clear the cached query data to ensure fresh fetch on next open
    queryClient.removeQueries({
      queryKey: getseedOptions({ client, path: { walletname: walletFileName } }).queryKey,
    })
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
                <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
                {t('settings.xpubs_modal.verification.title')}
              </DialogTitle>
              <DialogDescription>{t('settings.xpubs_modal.verification.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('settings.xpubs_modal.verification.label_password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('settings.xpubs_modal.verification.placeholder_password')}
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
                  ? t('settings.xpubs_modal.verification.text_button_submitting')
                  : t('settings.xpubs_modal.verification.text_button_submit')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <span className="flex items-center gap-2">{t('settings.xpubs_modal.title')}</span>
              </DialogTitle>
              <DialogDescription>{t('settings.xpubs_modal.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {seedQuery.isFetching ? (
                <div className="text-muted-foreground flex items-center justify-center gap-1 py-8">
                  <Loader2Icon className="h-4 w-4 animate-spin motion-reduce:hidden" />
                  {t('global.loading')}
                </div>
              ) : seedQuery.error ? (
                <div className="light:border-red-800 light:bg-red-50 rounded-lg border border-red-200 bg-red-900/20 p-2">
                  <div className="flex items-start gap-2">
                    <div className="light:text-red-800 text-sm text-red-200">
                      <div className="flex items-center">
                        <AlertTriangleIcon className="light:text-red-800 m-1 h-4 w-4 shrink-0 text-red-200" />
                        <p className="text-md font-medium">{t('settings.xpubs_modal.text_error_title')}</p>
                      </div>
                      <p className="p-1 text-xs">{seedQuery.error.message || t('global.errors.reason_unknown')}</p>
                    </div>
                  </div>
                </div>
              ) : accountXpubs.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto">
                  <Accordion type="single" collapsible className="w-full">
                    {accountXpubs.map((account) => (
                      <AccordionItem key={account.accountIndex} value={String(account.accountIndex)}>
                        <AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{account.accountName}</span>
                            <span className="text-muted-foreground text-xs">
                              ({t('settings.xpubs_modal.label_account')} {account.accountIndex})
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {/* Account-level xpub */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground text-xs">
                                  Extended Public Key
                                  <span className="text-muted-foreground/70 ml-2 font-mono">{account.path}</span>
                                </Label>
                              </div>
                              {account.xpubs.map((xpub, index) => (
                                <>
                                  <div key={index} className="bg-muted flex items-center gap-2 rounded-md p-2">
                                    <code className="flex-1 overflow-hidden font-mono text-xs break-all text-ellipsis">
                                      {xpub.xpub}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() => copyToClipboard(xpub.xpub)}
                                      aria-label={t('settings.xpubs_modal.aria_copy_external', {
                                        account: account.accountName,
                                      })}
                                    >
                                      {copiedXpub === xpub.xpub ? (
                                        <CheckIcon className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <CopyIcon className="h-3 w-3" />
                                      )}
                                    </Button>
                                  </div>
                                </>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ) : (
                <div className="text-muted-foreground py-8 text-center">
                  {t('settings.xpubs_modal.text_no_accounts')}
                </div>
              )}

              {/* Info message about xpubs */}
              {!seedQuery.isFetching && !seedQuery.error && accountXpubs.length > 0 && (
                <div className="light:border-blue-800 light:bg-blue-50 rounded-lg border border-blue-200 bg-blue-900/20 p-2">
                  <p className="light:text-blue-800 text-xs text-blue-200">{t('settings.xpubs_modal.text_info')}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <div className="flex w-full items-center justify-between">
                <div
                  className={cn('text-muted-foreground flex items-center gap-1 text-sm', {
                    'light:text-red-600 animate-pulse text-red-800': secondsLeft <= 10,
                  })}
                >
                  <ClockIcon className="h-4 w-4" />
                  <span
                    className={cn('mt-0.5 font-mono', {
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
