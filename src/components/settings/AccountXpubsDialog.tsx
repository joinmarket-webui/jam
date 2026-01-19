import { useState, useEffect, useMemo, type ComponentProps } from 'react'
import { getseedOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { mnemonicToSeed } from '@scure/bip39'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Network } from 'bitcoin-address-validation'
import {
  EyeIcon,
  EyeOffIcon,
  AlertTriangleIcon,
  ClockIcon,
  Loader2Icon,
  CopyIcon,
  CheckIcon,
  AlertCircleIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { useJars, useNetwork, type Jar } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { deriveAccountXpub } from '@/lib/bip32'
import { hashPassword } from '@/lib/hash'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, type WalletFileName } from '@/lib/utils'
import { convertExtendedPublicKey } from '@/lib/xpubs'
import type { JarIndex, SeedPhrase, WithRequiredProperty } from '@/types/global'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Badge } from '../ui/badge'
import { buttonVariants } from '../ui/button-variants'
import { CopyButton } from '../ui/jam/CopyButton'

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
  seedPhrase: SeedPhrase,
  network: Network,
  jars: Jar[],
): Promise<AccountXpubInfo[]> {
  const coinType = network === Network.mainnet ? 0 : 1

  const seed = await mnemonicToSeed(seedPhrase.join(' '))

  // Convert to native segwit format (zpub/vpub) and build account info
  const accounts: AccountXpubInfo[] = []
  for (let i = 0; i < jars.length; i++) {
    const jar = jars[i]

    const path = `m/${HD_PATH_PURPOSE}'/${coinType}'/${jar.jarIndex}'`
    const xpub = deriveAccountXpub(seed, path)

    const xpubs = []

    if (HD_PATH_PURPOSE !== 84) {
      const targetFormat = network === Network.mainnet ? 'xpub' : 'tpub'
      xpubs.push({
        name: targetFormat,
        path,
        network,
        xpub: convertExtendedPublicKey(xpub, targetFormat),
      })
    } else {
      const targetFormat = network === Network.mainnet ? 'zpub' : 'vpub'
      xpubs.push({
        name: targetFormat,
        path,
        network,
        xpub: convertExtendedPublicKey(xpub, targetFormat),
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

interface AccountXpubsAccordionProps {
  values: AccountXpubInfo[]
}

const AccountXpubsAccordion = ({ values }: AccountXpubsAccordionProps) => {
  const { t } = useTranslation()
  return (
    <Accordion type="single" collapsible className="w-full">
      {values.map((account, index) => {
        const accountLabel = t('settings.xpubs_modal.label_account', {
          accountIndex: account.accountIndex,
        })
        return (
          <AccordionItem key={index} value={String(account.accountIndex)}>
            <AccordionTrigger className="group/xpub-accordion-trigger no-underline!">
              <span className="flex items-center gap-2">
                <span className="text-base font-medium group-hover/xpub-accordion-trigger:underline">
                  {account.accountName}
                </span>
                <span className="text-muted-foreground text-xs">({accountLabel})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-sm">
                    <div className="flex flex-1 items-end gap-2">
                      {/* TODO: i18n */}Extended Public Key
                      <span className="text-muted-foreground/70 font-mono text-xs">{account.path}</span>
                    </div>
                    <div>
                      {account.xpubs.length === 0 ? undefined : (
                        <Badge variant="default">{account.xpubs[0].network}</Badge>
                      )}
                    </div>
                  </Label>
                  {account.xpubs.map((xpub, index) => {
                    const accountNameAndLabel = `${account.accountName} (${accountLabel})`
                    return (
                      <div key={index} className="bg-muted flex items-center gap-2 rounded-md p-2">
                        <code className="flex-1 overflow-hidden font-mono text-xs break-all text-ellipsis">
                          {xpub.xpub}
                        </code>
                        <CopyButton
                          className={buttonVariants({
                            size: 'icon',
                            variant: 'ghost',
                            className: 'shrink-0',
                          })}
                          value={xpub.xpub}
                          text={<CopyIcon className="h-3 w-3" />}
                          successText={<CheckIcon className="h-3 w-3 text-green-500" />}
                          title={t('settings.xpubs_modal.button_copy_title', {
                            account: accountNameAndLabel,
                          })}
                          aria-label={t('settings.xpubs_modal.button_copy_title', {
                            account: accountNameAndLabel,
                          })}
                          onSuccess={() =>
                            toast.success(
                              t('settings.xpubs_modal.alert_success_account_xpub_copied_message', {
                                account: accountNameAndLabel,
                              }),
                            )
                          }
                          onError={(e) =>
                            toast.error(
                              t('global.errors.error_copy_to_clipboard_failed', {
                                reason:
                                  (e instanceof Error ? e.message : undefined) || t('global.errors.reason_unknown'),
                              }),
                            )
                          }
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

type AccountXpubsDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
  hashedPassword: string
}

export const AccountXpubsDialog = ({ open, onOpenChange, walletFileName, hashedPassword }: AccountXpubsDialogProps) => {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordVerifiedAt, setPasswordVerifiedAt] = useState<number>()
  const isPasswordVerified = useMemo(() => passwordVerifiedAt !== undefined, [passwordVerifiedAt])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordVerificationError, setPasswordVerificationError] = useState<string>()
  const [timeLeft, setTimeLeft] = useState(JAM_SEED_MODAL_TIMEOUT)
  const secondsLeft = useMemo(() => Math.max(0, Math.round(timeLeft / 1_000)), [timeLeft])

  const { network } = useNetwork()

  const client = useApiClient()
  const queryClient = useQueryClient()
  const { jars } = useJars()

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

  const accountXpubsQueryKey = [walletFileName, 'xpubs']

  const accountXpubs = useQuery({
    queryKey: accountXpubsQueryKey,
    queryFn: withQueryDelay(
      async () => {
        if (!seedQuery.data) {
          return undefined
        }
        return await deriveAccountXpubsFromSeed(seedQuery.data, network, jars)
      },
      {
        delayAfter: 210,
      },
    ),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!seedQuery.data,
  })

  const isFetching = seedQuery.isFetching || accountXpubs.isFetching

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
      setShowPassword(false)
      setPassword('')
      setPasswordVerifiedAt(undefined)
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
          setPasswordVerifiedAt(Date.now())
          setPasswordVerificationError(undefined)
        } else {
          setPasswordVerificationError(t('settings.xpubs_modal.verification.text_error_password_incorrect'))
        }
      } catch (error) {
        const reason = (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown')
        setPasswordVerificationError(t('settings.xpubs_modal.verification.text_error', { reason }))
        console.error('Password verification error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }, 4)
  }

  const handleClose = () => {
    onOpenChange(false)
    setShowPassword(false)
    setPassword('')
    setPasswordVerifiedAt(undefined)
    setPasswordVerificationError(undefined)
    setTimeLeft(JAM_SEED_MODAL_TIMEOUT)

    // Remove sensitive data from query cache on close: If a user verifies the
    // password again without closing the dialog, no re-fetching takes place.
    queryClient.removeQueries({ queryKey: seedQueryOptions.queryKey })
    queryClient.removeQueries({ queryKey: accountXpubsQueryKey })
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
                    className={passwordVerificationError ? 'border-destructive' : ''}
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
                {passwordVerificationError && <p className="text-destructive text-sm">{passwordVerificationError}</p>}
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
              {!accountXpubs.error && (
                <div className="">
                  {isFetching ? (
                    <div className="text-muted-foreground flex items-center justify-center gap-1">
                      <Loader2Icon className="size-4 animate-spin motion-reduce:hidden" />
                      {t('global.loading')}
                    </div>
                  ) : accountXpubs.data && accountXpubs.data.length > 0 ? (
                    <>
                      <Alert variant="default">
                        <AlertCircleIcon />
                        <AlertTitle>{t('settings.xpubs_modal.text_info_title')}</AlertTitle>
                        <AlertDescription>{t('settings.xpubs_modal.text_info_message')}</AlertDescription>
                      </Alert>
                      <div className="bg-card my-2 rounded-lg px-4">
                        <AccountXpubsAccordion values={accountXpubs.data} />
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground text-center">
                      {t('settings.xpubs_modal.text_error_no_data')}
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
              {!accountXpubs.isFetching && accountXpubs.error && (
                <Alert variant="destructive">
                  <AlertTriangleIcon />
                  <AlertTitle>{t('settings.xpubs_modal.text_error_title')}</AlertTitle>
                  <AlertDescription>{accountXpubs.error.message || t('global.errors.reason_unknown')}</AlertDescription>
                </Alert>
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
