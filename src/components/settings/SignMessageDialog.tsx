import { useState, useMemo, type ComponentProps } from 'react'
import { signmessageMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangleIcon, CheckIcon, CopyIcon, PenLineIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { CopyButton } from '@/components/ui/jam/CopyButton'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useApiClient } from '@/hooks/useApiClient'
import { useQueryDisplayWallet } from '@/hooks/useQueryDisplayWallet'
import { getErrorReason } from '@/lib/errorReason'
import type { WalletFileName } from '@/lib/utils'
import type { WithRequiredProperty } from '@/types/global'

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

  const [addressOrPath, setAddressOrPath] = useState('')
  const [message, setMessage] = useState('')
  const [signature, setSignature] = useState<string>()

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

  const handleSign = async () => {
    if (!addressOrPath.trim() || !message.trim()) return

    const trimmedInput = addressOrPath.trim()
    const matchingOption = walletAddressOptions.find(
      (opt) => opt.address.toLowerCase() === trimmedInput.toLowerCase() || opt.hdPath === trimmedInput,
    )
    const targetHdPath = matchingOption ? matchingOption.hdPath : trimmedInput

    try {
      const response = await signMutation.mutateAsync({
        path: { walletname: walletFileName },
        body: {
          hd_path: targetHdPath,
          message: message,
        },
      })
      setSignature(response.signature)
    } catch (error) {
      console.error('Failed to sign message:', error)
    }
  }

  const handleReset = () => {
    setAddressOrPath('')
    setMessage('')
    setSignature(undefined)
    signMutation.reset()
  }

  const handleClose = () => {
    onOpenChange(false)
    handleReset()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} {...dialogProps}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLineIcon className="h-5 w-5" />
            {t('settings.sign_message_modal.title')}
          </DialogTitle>
          <DialogDescription>{t('settings.sign_message_modal.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sign-message-address">{t('settings.sign_message_modal.label_address')}</Label>
              {walletAddressOptions.length > 0 && (
                <Select
                  onValueChange={(val) => {
                    setAddressOrPath(val)
                    if (signature) setSignature(undefined)
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
              value={addressOrPath}
              onChange={(event_) => {
                setAddressOrPath(event_.target.value)
                if (signature) setSignature(undefined)
                if (signMutation.isError) signMutation.reset()
              }}
              disabled={signMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sign-message-content">{t('settings.sign_message_modal.label_message')}</Label>
            <Textarea
              id="sign-message-content"
              rows={3}
              placeholder={t('settings.sign_message_modal.placeholder_message')}
              value={message}
              onChange={(event_) => {
                setMessage(event_.target.value)
                if (signature) setSignature(undefined)
                if (signMutation.isError) signMutation.reset()
              }}
              disabled={signMutation.isPending}
            />
          </div>

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
                <Label htmlFor="sign-message-signature" className="font-semibold">
                  {t('settings.sign_message_modal.label_signature')}
                </Label>
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
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={signMutation.isPending || (!addressOrPath && !message && !signature)}
            >
              {t('settings.sign_message_modal.button_reset')}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                {t('global.close')}
              </Button>
              {!signature && (
                <Button
                  onClick={() => {
                    void handleSign()
                  }}
                  disabled={!addressOrPath.trim() || !message.trim() || signMutation.isPending}
                >
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
      </DialogContent>
    </Dialog>
  )
}
