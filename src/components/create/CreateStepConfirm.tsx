import { useEffect, useState } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { WalletFileName } from '@/lib/utils'
import { MaskedText } from '../ui/jam/MaskedText'
import { SeedPhraseGrid } from '../ui/jam/SeedPhraseGrid'
import { Switch } from '../ui/switch'

interface CreateStepConfirmProps {
  walletFileName: WalletFileName
  password: string
  seedphrase: string[]
  onConfirm: () => Promise<void>
}

export const CreateStepConfirm = ({ walletFileName, password, seedphrase, onConfirm }: CreateStepConfirmProps) => {
  const [revealSensitiveInfo, setRevealSensitiveInfo] = useState({ checked: false, dirty: false })
  const [backupConfirmed, setBackupConfirmed] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    if (backupConfirmed) return

    const toastId = toast.message(
      <Alert>
        <AlertCircleIcon />
        <AlertTitle>
          {/* TODO: i18n */}
          Save Your Seed Phrase
        </AlertTitle>
        <AlertDescription>
          {/* TODO: change i18n key ("alert_description") */}
          {t('create_wallet.subtitle_wallet_created')}
        </AlertDescription>
      </Alert>,
      {
        duration: Infinity,
        unstyled: true,
      },
    )

    return () => {
      toast.dismiss(toastId)
    }
  }, [backupConfirmed, t])

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div>
          <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_wallet_name')}</Label>
          <span className="text-sm font-semibold break-all select-all">{walletFileName}</span>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_password')}</Label>
          <MaskedText
            className="font-mono text-sm font-semibold break-all slashed-zero select-none"
            masked={!revealSensitiveInfo.checked}
            maskedText="maskedmaskedmaskedmasked"
          >
            {password}
          </MaskedText>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">{/* i18n confirmation_label_seedphrase */}Seed Phrase</Label>
          <div className="bg-muted rounded-lg p-2">
            <SeedPhraseGrid value={seedphrase} masked={!revealSensitiveInfo.checked} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-start gap-2">
          <Switch
            id="switch-reveal-seed"
            checked={revealSensitiveInfo.checked}
            onCheckedChange={(checked) => setRevealSensitiveInfo((it) => ({ ...it, checked, dirty: true }))}
          />
          <Label htmlFor="switch-reveal-seed">{t('create_wallet.confirmation_toggle_reveal_info')}</Label>
        </div>

        <div className="flex justify-start gap-2">
          <Switch
            id="switch-confirm-backup"
            checked={backupConfirmed}
            onCheckedChange={(checked) => setBackupConfirmed(checked)}
            disabled={!revealSensitiveInfo.dirty}
          />
          <Label htmlFor="switch-confirm-backup">{t('create_wallet.confirmation_toggle_info_written_down')}</Label>
        </div>
      </div>

      <Button
        onClick={async () => await onConfirm()}
        className="w-full"
        size="lg"
        disabled={!backupConfirmed || !revealSensitiveInfo.dirty}
      >
        {t('create_wallet.next_button')}
      </Button>
    </div>
  )
}
