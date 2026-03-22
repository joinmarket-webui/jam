import { useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import type { TFunction } from 'i18next'
import { AlertTriangleIcon, CheckCircle2Icon, InfoIcon } from 'lucide-react'
import { useForm, useWatch, type Mode, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import { cn, DUMMY_SEED_PHRASE } from '@/lib/utils'
import { DevBadge } from '../dev/DevBadge'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Textarea } from '../ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const VALID_SEED_WORD_COUNTS = [12, 15, 18, 21, 24]
const SEED_WORD_COUNT_HINT = VALID_SEED_WORD_COUNTS.join(' / ')

const showDummyMnemonicHelper = isDebugFeatureEnabled('importDummyMnemonicPhrase')

interface ImportDetailsFormValues {
  mnemonicPhrase: string
}

const normalizeSeedPhrase = (value: string | undefined) =>
  (value ?? '')
    .toLowerCase()
    .split(/[\s,]+/)
    .map((word) => word.trim())
    .map((word) => word.replace(/^\d+\.$/, ''))
    .join(' ')

const isBip39Mnemonic = (value: string) => {
  const normalized = normalizeSeedPhrase(value)
  return validateMnemonic(normalized, wordlist)
}

const importDetailsFormSchema = (t: TFunction) => {
  return yup
    .object({
      mnemonicPhrase: yup
        .string()
        .transform((currentValue: string | undefined) => normalizeSeedPhrase(currentValue))
        .required(t('import_wallet.import_details.feedback_invalid_menmonic_phrase'))
        .test(
          'valid-bip39-mnemonic-phrase-test',
          t('import_wallet.import_details.feedback_invalid_menmonic_phrase'),
          (value) => {
            return isBip39Mnemonic(value)
          },
        ),
    })
    .required()
}

type ImportDetailsFormProps = {
  className?: string
  onSubmit: SubmitHandler<ImportDetailsFormValues>
  initialValues?: ImportDetailsFormValues
  disabled?: boolean
  mode?: Mode
}

export const ImportDetailsForm = ({
  className,
  onSubmit,
  initialValues,
  disabled,
  mode = 'onSubmit',
}: ImportDetailsFormProps) => {
  const { t } = useTranslation()

  const schema = useMemo(() => importDetailsFormSchema(t), [t])

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isValid, isSubmitting, isSubmitSuccessful, isSubmitted },
  } = useForm({
    mode,
    values: initialValues,
    resolver: yupResolver(schema),
  })
  const watchedSeedPhrase = useWatch({
    control,
    name: 'mnemonicPhrase',
  })
  const isSeedPhraseBip39Valid = useMemo(() => isBip39Mnemonic(watchedSeedPhrase), [watchedSeedPhrase])

  const doOnSubmit = handleSubmit(onSubmit)

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
      <div className="space-y-2">
        <Field data-invalid={errors.mnemonicPhrase !== undefined}>
          <FieldLabel htmlFor="import-wallet-seed">
            {t('import_wallet.import_details.label_menmonic_phrase')}
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="text-muted-foreground ml-1 inline size-3.5 align-text-bottom" />
              </TooltipTrigger>
              <TooltipContent>
                {/* TODO: i18n */}
                <p>Expects {SEED_WORD_COUNT_HINT} words.</p>
              </TooltipContent>
            </Tooltip>
          </FieldLabel>
          <Textarea
            id="import-wallet-seed"
            rows={4}
            placeholder={t('import_wallet.import_details.placeholder_menmonic_phrase')}
            {...register('mnemonicPhrase', {
              required: true,
            })}
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
        {errors.mnemonicPhrase?.message && (
          <div className="text-destructive text-xs">{errors.mnemonicPhrase.message}</div>
        )}
        {isSeedPhraseBip39Valid && (
          <Alert variant="success" className="py-2">
            <CheckCircle2Icon />
            <AlertDescription>
              {/* TODO: i18n */}
              Mnemonic phrase is valid
            </AlertDescription>
          </Alert>
        )}
        {isSubmitted && !isSubmitSuccessful && !isValid && !isSeedPhraseBip39Valid && (
          <Alert variant="warning" className="py-2">
            <AlertTriangleIcon />
            <AlertTitle>
              {/* TODO: i18n */}
              Mnemonic phrase is not recognized
            </AlertTitle>
            <AlertDescription className="text-sm">
              {/* TODO: i18n */}
              Only BIP-39 compliant mnemonic phrases can be imported. Please review your inputs carefully.
            </AlertDescription>
          </Alert>
        )}
        {showDummyMnemonicHelper && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setValue('mnemonicPhrase', DUMMY_SEED_PHRASE.join(' '), {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          >
            Use dummy mnemonic <DevBadge />
          </Button>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={disabled || isSubmitting} size="xxl">
        {isSubmitting ? (
          <>
            <Spinner className="motion-reduce:hidden" />
            {t('import_wallet.import_details.text_button_submitting')}
          </>
        ) : (
          <>{t('import_wallet.import_details.text_button_submit')}</>
        )}
      </Button>
    </form>
  )
}
