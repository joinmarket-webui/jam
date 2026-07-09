import { useEffect } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import type { TFunction } from 'i18next'
import { AlertCircleIcon, ChevronRightIcon } from 'lucide-react'
import { useForm, useWatch, type Mode, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { WalletFileName } from '@/lib/utils'
import type { MnemonicPhrase } from '@/types/global'
import { Field, FieldLabel } from '../ui/field'
import { MaskedText } from '../ui/jam/MaskedText'
import { SeedPhraseGrid } from '../ui/jam/SeedPhraseGrid'
import { Switch } from '../ui/switch'

export interface CreateWalletConfirmFormValues {
  revealSensitiveInfo: boolean
  backupConfirmed: boolean
}

const FORM_INPUT_DEFAULT_VALUES: Required<CreateWalletConfirmFormValues> = {
  revealSensitiveInfo: false,
  backupConfirmed: false,
}

const createFormSchema = (t: TFunction) => {
  return yup
    .object({
      revealSensitiveInfo: yup.boolean().required(),
      backupConfirmed: yup.boolean().isTrue(t('create_wallet.subtitle_wallet_created')),
    })
    .required()
}

interface CreateStepConfirmProps {
  walletFileName: WalletFileName
  password: string
  mnemonicPhrase: MnemonicPhrase
  onConfirm: () => Promise<void>
  mode?: Mode
}

export const CreateStepConfirm = ({
  walletFileName,
  password,
  mnemonicPhrase,
  onConfirm,
  mode = 'onSubmit',
}: CreateStepConfirmProps) => {
  const { t } = useTranslation()

  const schema = createFormSchema(t)

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, touchedFields, isSubmitting },
  } = useForm({
    mode,
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<CreateWalletConfirmFormValues, unknown, CreateWalletConfirmFormValues>,
  })

  const backupConfirmed = useWatch({ control, name: 'backupConfirmed' })
  const revealSensitiveInfo = useWatch({ control, name: 'revealSensitiveInfo' })

  useEffect(() => {
    if (backupConfirmed) return

    const toastId = toast.info(t('create_wallet.alert_save_seed_title'), {
      id: 'save-seed-phrase-reminder',
      icon: <AlertCircleIcon />,
      description: t('create_wallet.subtitle_wallet_created'),
      duration: Number.POSITIVE_INFINITY,
    })

    return () => {
      toast.dismiss(toastId)
    }
  }, [backupConfirmed, t])

  const doOnSubmit = handleSubmit(onConfirm)

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <div>
          <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_wallet_name')}</Label>
          <span className="font-semibold break-all select-all">{walletFileName}</span>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_password')}</Label>
          <MaskedText
            className="font-mono font-semibold break-all slashed-zero select-none"
            masked={!revealSensitiveInfo}
            maskedText="maskedmaskedmaskedmasked"
          >
            {password}
          </MaskedText>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">{/* i18n confirmation_label_seedphrase */}Seed Phrase</Label>
          <div className="bg-muted rounded-lg p-2">
            <SeedPhraseGrid value={mnemonicPhrase} masked={!revealSensitiveInfo} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Field
            data-invalid={errors.revealSensitiveInfo !== undefined}
            orientation="horizontal"
            className="items-start"
          >
            <Switch
              className="mt-0.5 shrink-0"
              id="switch-reveal-seed"
              checked={revealSensitiveInfo}
              onCheckedChange={(checked) =>
                setValue('revealSensitiveInfo', checked, { shouldValidate: true, shouldTouch: true })
              }
            />
            <FieldLabel htmlFor="switch-reveal-seed" className="min-w-0 flex-1">
              {t('create_wallet.confirmation_toggle_reveal_info')}
            </FieldLabel>
          </Field>
          {errors.revealSensitiveInfo?.message && (
            <div className="text-destructive text-xs">{errors.revealSensitiveInfo.message}</div>
          )}
        </div>

        <div className="space-y-2">
          <Field data-invalid={errors.backupConfirmed !== undefined} orientation="horizontal" className="items-start">
            <Switch
              className="mt-0.5 shrink-0"
              id="switch-confirm-backup"
              required={true}
              disabled={!touchedFields.revealSensitiveInfo}
              checked={backupConfirmed}
              onCheckedChange={(checked) => setValue('backupConfirmed', checked, { shouldValidate: true })}
            />
            <FieldLabel htmlFor="switch-confirm-backup" className="min-w-0 flex-1">
              {t('create_wallet.confirmation_toggle_info_written_down')}
            </FieldLabel>
          </Field>
          {errors.backupConfirmed?.message && (
            <div className="text-destructive text-xs">{errors.backupConfirmed.message}</div>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" size="xxl" disabled={isSubmitting}>
        {t('create_wallet.next_button')}
        <ChevronRightIcon />
      </Button>
    </form>
  )
}
