import { useState, useEffect, useMemo, type ComponentProps } from 'react'
import { getseedOptions } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { mnemonicToSeed } from '@scure/bip39'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Network } from 'bitcoin-address-validation'
import { AlertTriangleIcon, ClockIcon, CopyIcon, CheckIcon, AlertCircleIcon } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { useJars, useDetectNetwork, type Jar } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import { deriveAccountXpub } from '@/lib/bip32'
import { withQueryDelay } from '@/lib/queryClient'
import { cn, type WalletFileName } from '@/lib/utils'
import { convertExtendedPublicKey } from '@/lib/xpubs'
import type { JarIndex, Milliseconds, MnemonicPhrase, WithRequiredProperty } from '@/types/global'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Badge } from '../ui/badge'
import { buttonVariants } from '../ui/button-variants'
import { CopyButton } from '../ui/jam/CopyButton'
import { Spinner } from '../ui/spinner'
import { PasswordVerificationForm } from '../utils/PasswordVerificationForm'

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
  mnemonicPhrase: MnemonicPhrase,
  network: Network,
  jars: Jar[],
): Promise<AccountXpubInfo[]> {
  const coinType = network === Network.mainnet ? 0 : 1

  const seed = await mnemonicToSeed(mnemonicPhrase.join(' '))

  // Convert to native segwit format (zpub/vpub) and build account info
  return jars.map((jar) => {
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
    return {
      accountIndex: jar.jarIndex,
      accountName: jar.name,
      path,
      xpubs,
    }
  })
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
          accountIndex: `#${account.accountIndex}`,
        })
        return (
          <AccordionItem key={index} value={String(account.accountIndex)}>
            <AccordionTrigger className="group/xpub-accordion-trigger px-4 no-underline!">
              <span className="flex-1 flex-col group-hover/xpub-accordion-trigger:underline">
                {account.accountName}
              </span>
              <span className="text-muted-foreground font-mono">{accountLabel}</span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-1 p-4 pt-2">
              <Label className="text-muted-foreground text-sm">
                <div className="flex flex-1 items-end gap-2">
                  {/* TODO: i18n */}Extended Public Key
                  <span className="text-muted-foreground/70 font-mono text-xs">{account.path}</span>
                </div>
                <div>
                  {account.xpubs.length === 0 ? undefined : <Badge variant="default">{account.xpubs[0].network}</Badge>}
                </div>
              </Label>
              {account.xpubs.map((xpub, index) => {
                const accountNameAndLabel = `${account.accountName} (${accountLabel})`
                return (
                  <div key={index} className="bg-muted flex items-center gap-2 rounded-md p-2">
                    <div className="flex-1 font-mono text-xs break-all select-all">{xpub.xpub}</div>
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
                      onError={(error) =>
                        toast.error(
                          t('global.errors.error_copy_to_clipboard_failed', {
                            reason:
                              (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown'),
                          }),
                        )
                      }
                    />
                  </div>
                )
              })}
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
  autoCloseTimeout: Milliseconds
}

export const AccountXpubsDialog = ({
  open,
  onOpenChange,
  walletFileName,
  hashedPassword,
  autoCloseTimeout,
  ...dialogProps
}: AccountXpubsDialogProps) => {
  const { t } = useTranslation()

  const [passwordVerifiedAt, setPasswordVerifiedAt] = useState<number>()
  const isPasswordVerified = useMemo(() => passwordVerifiedAt !== undefined, [passwordVerifiedAt])
  const [timeLeft, setTimeLeft] = useState(autoCloseTimeout)

  if (timeLeft <= 0 && passwordVerifiedAt !== undefined) {
    setPasswordVerifiedAt(undefined)
  }

  const secondsLeft = Math.max(0, Math.round(timeLeft / 1_000))

  const { network } = useDetectNetwork()

  const client = useApiClient()
  const queryClient = useQueryClient()
  const { jars } = useJars()

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
    select: (data) => data.seedphrase.split(/\s+/) as MnemonicPhrase,
  })

  const accountXpubsQueryKey = [walletFileName, 'xpubs']

  const accountXpubs = useQuery({
    queryKey: accountXpubsQueryKey,
    queryFn: withQueryDelay(
      async () => {
        if (!seedQuery.data) return undefined
        return await deriveAccountXpubsFromSeed(seedQuery.data, network, jars)
      },
      {
        throttle: 210,
      },
    ),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    enabled: !!seedQuery.data,
  })

  const isFetching = seedQuery.isFetching || accountXpubs.isFetching

  useEffect(() => {
    if (open && isPasswordVerified && seedQuery.data === undefined) {
      void seedQuery.refetch()
    }
  }, [open, isPasswordVerified, seedQuery])

  useEffect(() => {
    if (passwordVerifiedAt === undefined) return

    const xpubsDisplayedAt = Math.max(accountXpubs.dataUpdatedAt, passwordVerifiedAt)
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, xpubsDisplayedAt + autoCloseTimeout - Date.now()))
    }, 333)

    return () => {
      clearInterval(interval)
    }
  }, [accountXpubs.dataUpdatedAt, passwordVerifiedAt, autoCloseTimeout])

  const handleClose = () => {
    onOpenChange(false)
    setPasswordVerifiedAt(undefined)
    setTimeLeft(autoCloseTimeout)

    // Remove sensitive data from query cache on close: If a user verifies the
    // password again without closing the dialog, no re-fetching takes place.
    queryClient.removeQueries({ queryKey: seedQueryOptions.queryKey })
    queryClient.removeQueries({ queryKey: accountXpubsQueryKey })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} {...dialogProps}>
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

            <PasswordVerificationForm
              walletFileName={walletFileName}
              hashedPassword={hashedPassword}
              i18nKeyPrefix="settings.xpubs_modal.verification"
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
                <span className="flex items-center gap-2">{t('settings.xpubs_modal.title')}</span>
              </DialogTitle>
              <DialogDescription>{t('settings.xpubs_modal.subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {!accountXpubs.error && (
                <div>
                  {isFetching ? (
                    <div className="text-muted-foreground flex items-center justify-center gap-1">
                      <Spinner className="motion-reduce:hidden" />
                      {t('global.loading')}
                    </div>
                  ) : accountXpubs.data && accountXpubs.data.length > 0 ? (
                    <>
                      <Alert variant="default">
                        <AlertCircleIcon />
                        <AlertTitle>{t('settings.xpubs_modal.text_info_title')}</AlertTitle>
                        <AlertDescription>{t('settings.xpubs_modal.text_info_message')}</AlertDescription>
                      </Alert>
                      <div className="bg-card my-2 rounded-lg">
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
                    'text-destructive! animate-pulse': secondsLeft <= 10,
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
