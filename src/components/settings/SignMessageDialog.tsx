import { useMemo, useState, type ComponentProps } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { signmessageMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangleIcon, CheckIcon, CopyIcon, PenLineIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CopyButton } from '@/components/ui/jam/CopyButton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useApiClient } from '@/hooks/useApiClient'
import { useQueryDisplayWallet } from '@/hooks/useQueryDisplayWallet'
import { getErrorReason } from '@/lib/errorReason'
import type { WalletFileName } from '@/lib/utils'
import type { WithRequiredProperty } from '@/types/global'
import {
  createSignMessageDialogSchema,
  SIGN_MESSAGE_FORM_DEFAULT_VALUES,
  type SignMessageFormValues,
} from './SignMessageDialog.schema'

type SignMessageDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  walletFileName: WalletFileName
}

export const SignMessageDialog = ({ open, onOpenChange, walletFileName, ...dialogProps }: SignMessageDialogProps) => {
  const { t } = useTranslation()
  const client = useApiClient()
  const { walletInfo } = useQueryDisplayWallet({ walletFileName })

  const [signature, setSignature] = useState<string>()

  const schema = useMemo(() => createSignMessageDialogSchema({ t }), [t])

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<SignMessageFormValues>({
    mode: 'onChange',
    defaultValues: SIGN_MESSAGE_FORM_DEFAULT_VALUES,
    resolver: yupResolver(schema),
  })

  const addressOrPath = useWatch({ control, name: 'addressOrPath' })
  const message = useWatch({ control, name: 'message' })

  const walletAddressOptions = useMemo(() => {
    if (!walletInfo?.accounts) return []
    const addresses: { address: string; hdPath: string }[] = []
    for (const account of walletInfo.accounts) {
      for (const branch of account.branches || []) {
        for (const entry of branch.entries || []) {
          if (entry.address && entry.hd_path) {
            addresses.push({ address: entry.address, hdPath: entry.hd_path })
          }
        }
      }
    }
    return addresses
  }, [walletInfo])

  const signMutation = useMutation({
    ...signmessageMutation({ client }),
  })

  const onSubmit = async ({ addressOrPath: rawAddressOrPath, message: rawMessage }: SignMessageFormValues) => {
    const trimmedInput = rawAddressOrPath.trim()
    const trimmedMessage = rawMessage.trim()
    if (!trimmedInput || !trimmedMessage) return

    const matchingOption = walletAddressOptions.find(
      (opt) => opt.address.toLowerCase() === trimmedInput.toLowerCase() || opt.hdPath === trimmedInput,
    )
    const targetHdPath = matchingOption ? matchingOption.hdPath : trimmedInput

    try {
      const response = await signMutation.mutateAsync({
        path: { walletname: walletFileName },
        body: {
          hd_path: targetHdPath,
          message: trimmedMessage,
        },
      })
      setSignature(response.signature)
    } catch (error) {
      console.error('Failed to sign message:', error)
    }
  }

  const handleReset = () => {
    reset(SIGN_MESSAGE_FORM_DEFAULT_VALUES)
    setSignature(undefined)
    signMutation.reset()
  }

  const handleClose = () => {
    onOpenChange(false)
    handleReset()
  }

  const canSign = Boolean(addressOrPath?.trim()) && Boolean(message?.trim())

  const doOnSubmit = handleSubmit(onSubmit)

  return (
    <Dialog open={open} onOpenChange={handleClose} {...dialogProps}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={(event) => void doOnSubmit(event)} noValidate>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLineIcon className="h-5 w-5" />
              {t('settings.sign_message_modal.title')} <Badge variant="muted">{t('global.experimental')}</Badge>
            </DialogTitle>
            <DialogDescription>{t('settings.sign_message_modal.subtitle')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field data-invalid={errors.addressOrPath !== undefined}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="sign-message-address">{t('settings.sign_message_modal.label_address')}</FieldLabel>
                {walletAddressOptions.length > 0 && (
                  <Select
                    onValueChange={(val) => {
                      setValue('addressOrPath', val, {
                        shouldDirty: true,
                        shouldTouch: true,
                        shouldValidate: true,
                      })
                      if (signature) setSignature(undefined)
                      if (signMutation.isError) signMutation.reset()
                    }}
                  >
                    <SelectTrigger className="h-7 w-auto gap-1 text-xs">
                      <SelectValue placeholder={t('settings.sign_message_modal.select_from_wallet')} />
                    </SelectTrigger>
                    <SelectContent>
                      {walletAddressOptions.map((opt) => (
                        <SelectItem key={opt.address} value={opt.address} className="font-mono text-xs">
                          {opt.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Input
                id="sign-message-address"
                placeholder={t('settings.sign_message_modal.placeholder_address')}
                {...register('addressOrPath', {
                  onChange: () => {
                    if (signature) setSignature(undefined)
                    if (signMutation.isError) signMutation.reset()
                  },
                })}
                disabled={signMutation.isPending}
              />
              {errors.addressOrPath?.message && <FieldError>{errors.addressOrPath.message}</FieldError>}
            </Field>

            <Field data-invalid={errors.message !== undefined}>
              <FieldLabel htmlFor="sign-message-content">{t('settings.sign_message_modal.label_message')}</FieldLabel>
              <Textarea
                id="sign-message-content"
                rows={3}
                placeholder={t('settings.sign_message_modal.placeholder_message')}
                {...register('message', {
                  onChange: () => {
                    if (signature) setSignature(undefined)
                    if (signMutation.isError) signMutation.reset()
                  },
                })}
                disabled={signMutation.isPending}
              />
              {errors.message?.message && <FieldError>{errors.message.message}</FieldError>}
            </Field>

            {signMutation.isError && (
              <Alert variant="destructive">
                <AlertTriangleIcon />
                <AlertTitle>{t('settings.sign_message_modal.text_error_title')}</AlertTitle>
                <AlertDescription>
                  {getErrorReason(signMutation.error, t('global.errors.reason_unknown'))}
                </AlertDescription>
              </Alert>
            )}

            {signature && (
              <div className="bg-muted animate-in fade-in space-y-2 rounded-lg p-4 duration-200">
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="sign-message-signature" className="font-semibold">
                    {t('settings.sign_message_modal.label_signature')}
                  </FieldLabel>
                  <CopyButton
                    value={signature}
                    text={
                      <span className="flex items-center gap-1 text-xs">
                        <CopyIcon className="h-3.5 w-3.5" />
                        {t('settings.sign_message_modal.button_copy')}
                      </span>
                    }
                    successText={
                      <span className="text-brand-success flex items-center gap-1 text-xs font-medium">
                        <CheckIcon className="h-3.5 w-3.5" />
                        {t('global.button_copy_text_confirmed')}
                      </span>
                    }
                    onSuccess={() => toast.success(t('settings.sign_message_modal.alert_success_copied'))}
                  />
                </div>
                <Textarea
                  id="sign-message-signature"
                  rows={3}
                  readOnly
                  value={signature}
                  className="bg-background/50 font-mono text-xs select-all"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <div className="flex w-full items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={signMutation.isPending || (!addressOrPath && !message && !signature)}
              >
                {t('settings.sign_message_modal.button_reset')}
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {t('global.close')}
                </Button>
                {!signature && (
                  <Button type="submit" disabled={!canSign || signMutation.isPending}>
                    {signMutation.isPending ? (
                      <>
                        <Spinner className="motion-reduce:hidden" />
                        {t('settings.sign_message_modal.button_signing')}
                      </>
                    ) : (
                      t('settings.sign_message_modal.button_sign')
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
