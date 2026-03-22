import { yupResolver } from '@hookform/resolvers/yup'
import { ChevronLeftIcon } from 'lucide-react'
import { useForm, useWatch, type Mode, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { WalletFileName } from '@/lib/utils'
import type { MnemonicPhrase } from '@/types/global'
import { Field, FieldLabel } from '../ui/field'
import { MaskedText } from '../ui/jam/MaskedText'
import { SeedPhraseGrid } from '../ui/jam/SeedPhraseGrid'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'

export interface ImportWalletConfirmFormValues {
  revealSensitiveInfo: boolean
}

const FORM_INPUT_DEFAULT_VALUES: Required<ImportWalletConfirmFormValues> = {
  revealSensitiveInfo: false,
}

const createFormSchema = () => {
  return yup
    .object({
      revealSensitiveInfo: yup.boolean().required(),
    })
    .required()
}

interface ImportStepConfirmProps {
  walletFileName: WalletFileName
  password: string
  mnemonicPhrase: MnemonicPhrase
  onConfirm: () => Promise<void>
  onBack: () => void
  mode?: Mode
}

export const ImportStepConfirm = ({
  walletFileName,
  password,
  mnemonicPhrase,
  onConfirm,
  onBack,
  mode = 'onSubmit',
}: ImportStepConfirmProps) => {
  const { t } = useTranslation()

  const schema = createFormSchema()

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    mode,
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<ImportWalletConfirmFormValues, unknown, ImportWalletConfirmFormValues>,
  })

  const revealSensitiveInfo = useWatch({ control, name: 'revealSensitiveInfo' })

  const doOnSubmit = handleSubmit(onConfirm)

  return (
    <div className="space-y-2">
      <form onSubmit={(event) => void doOnSubmit(event)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <div>
            <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_wallet_name')}</Label>
            <span className="text-sm font-semibold break-all select-all">{walletFileName}</span>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_password')}</Label>
            <MaskedText
              className="font-mono text-sm font-semibold break-all slashed-zero select-none"
              masked={!revealSensitiveInfo}
              maskedText="maskedmaskedmaskedmasked"
            >
              {password}
            </MaskedText>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">
              {/* i18n confirmation_label_seedphrase */}Seed Phrase
            </Label>
            <div className="bg-muted rounded-lg p-2">
              <SeedPhraseGrid value={mnemonicPhrase} masked={!revealSensitiveInfo} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Field data-invalid={errors.revealSensitiveInfo !== undefined} orientation="horizontal">
            <Switch
              id="switch-reveal-seed"
              checked={revealSensitiveInfo}
              onCheckedChange={(checked) =>
                setValue('revealSensitiveInfo', checked, { shouldValidate: true, shouldTouch: true })
              }
            />
            <FieldLabel htmlFor="switch-reveal-seed">{t('create_wallet.confirmation_toggle_reveal_info')}</FieldLabel>
          </Field>
          {errors.revealSensitiveInfo?.message && (
            <div className="text-destructive text-xs">{errors.revealSensitiveInfo.message}</div>
          )}
        </div>

        <Button type="submit" className="w-full" size="xxl">
          {isSubmitting ? (
            <>
              <Spinner className="motion-reduce:hidden" />
              {t('import_wallet.confirmation.text_button_submitting')}
            </>
          ) : (
            <>{t('import_wallet.confirmation.text_button_submit')}</>
          )}
        </Button>
      </form>
      <Button variant="ghost" onClick={onBack}>
        <ChevronLeftIcon className="h-4 w-4" />
        {t('global.back')}
      </Button>
    </div>
  )
}
