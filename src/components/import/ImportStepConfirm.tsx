import type { ComponentProps } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { AlertTriangleIcon, ChevronLeftIcon } from 'lucide-react'
import { useForm, useWatch, type Mode, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { GAPLIMIT_WARN_THRESHOLD } from '@/constants/jam'
import { cn, walletDisplayNameToFileName } from '@/lib/utils'
import type { CreateWalletForm } from '../create/CreateWalletForm'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Alert, AlertDescription } from '../ui/alert'
import { Field, FieldLabel } from '../ui/field'
import { MaskedText } from '../ui/jam/MaskedText'
import { SeedPhraseGrid } from '../ui/jam/SeedPhraseGrid'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'
import type { ImportDetailsForm } from './ImportDetailsForm'

type WalletDetailsValues = Parameters<ComponentProps<typeof CreateWalletForm>['onSubmit']>[0]
type ImportDetailsValues = Parameters<ComponentProps<typeof ImportDetailsForm>['onSubmit']>[0]

type ImportConfirmValues = {
  walletDetails: WalletDetailsValues
  importDetails: ImportDetailsValues
}

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
  value: ImportConfirmValues
  onConfirm: (value: ImportConfirmValues) => Promise<void>
  onBack: () => void
  mode?: Mode
}

export const ImportStepConfirm = ({
  value: { walletDetails, importDetails },
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

  const doOnSubmit = handleSubmit(async () => {
    setValue('revealSensitiveInfo', false)
    return await onConfirm({
      walletDetails,
      importDetails,
    })
  })

  const showGaplimitWarning = importDetails.gaplimit > GAPLIMIT_WARN_THRESHOLD

  return (
    <div className="space-y-2">
      <form onSubmit={(event) => void doOnSubmit(event)} className="space-y-6" noValidate>
        <div className="space-y-2">
          <div>
            <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_wallet_name')}</Label>
            <span className="font-semibold break-all select-all">
              {walletDisplayNameToFileName(walletDetails.walletName)}
            </span>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">{t('create_wallet.confirmation_label_password')}</Label>
            <MaskedText
              className="font-mono font-semibold break-all slashed-zero select-none"
              masked={!revealSensitiveInfo}
              maskedText="maskedmaskedmaskedmasked"
            >
              {walletDetails.password}
            </MaskedText>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="mnemonic">
              <AccordionTrigger>{t('import_wallet.import_details.label_menmonic_phrase')}</AccordionTrigger>
              <AccordionContent className="bg-muted rounded-lg p-2">
                <SeedPhraseGrid value={importDetails.mnemonicPhrase.split(/\s+/)} masked={!revealSensitiveInfo} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="options">
              <AccordionTrigger
                className={cn({
                  'light:text-yellow-800 text-yellow-200/90': showGaplimitWarning,
                })}
              >
                <div className="flex items-center gap-2">
                  {showGaplimitWarning && <AlertTriangleIcon />}
                  {t('import_wallet.import_details.import_options')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                <div>
                  <div>{t('import_wallet.import_details.label_blockheight')}</div>
                  <div className="text-muted-foreground text-xs">
                    {t('import_wallet.import_details.description_blockheight')}
                  </div>
                  <div className="text-xl">{importDetails.blockheight}</div>
                </div>
                <div>
                  <div>{t('import_wallet.import_details.label_gaplimit')}</div>
                  <div className="text-muted-foreground text-xs">
                    {t('import_wallet.import_details.description_gaplimit')}
                  </div>
                  <div className="text-xl">{importDetails.gaplimit}</div>
                </div>
                {showGaplimitWarning && (
                  <Alert variant="warning">
                    <AlertTriangleIcon />
                    <AlertDescription className="whitespace-pre-line">
                      {t('import_wallet.import_details.alert_high_gaplimit_value')}
                    </AlertDescription>
                  </Alert>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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

        <Button type="submit" className="w-full" size="xxl" disabled={isSubmitting}>
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
      <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
        <ChevronLeftIcon />
        {t('global.back')}
      </Button>
    </div>
  )
}
