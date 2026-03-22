import { useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import type { TFunction } from 'i18next'
import {
  AlertTriangleIcon,
  BlocksIcon,
  CheckCircle2Icon,
  InfoIcon,
  OctagonAlertIcon,
  UnfoldHorizontalIcon,
} from 'lucide-react'
import { useForm, useWatch, type Mode, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { isDebugFeatureEnabled, isDevMode } from '@/constants/debugFeatures'
import { GAPLIMIT_WARN_THRESHOLD } from '@/constants/jam'
import { JM_GAPLIMIT_DEFAULT } from '@/constants/jm'
import { cn, DUMMY_SEED_PHRASE, SEGWIT_ACTIVATION_BLOCK } from '@/lib/utils'
import { DevBadge } from '../dev/DevBadge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { Textarea } from '../ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

const DUMMY_SEED_PHRASE_STRING = DUMMY_SEED_PHRASE.join(' ')
const VALID_SEED_WORD_COUNTS = [12, 15, 18, 21, 24]
const SEED_WORD_COUNT_HINT = VALID_SEED_WORD_COUNTS.join(' / ')

const GAPLIMIT_SUGGESTIONS = {
  normal: JM_GAPLIMIT_DEFAULT,
  heavy: JM_GAPLIMIT_DEFAULT * 4,
}

const MIN_BLOCKHEIGHT_VALUE = 1
/**
 * Maximum blockheight value.
 * Value choosen based on estimation of blockheight in tge year 2140 (plus some buffer):
 * 365 × 144 × (2140 - 2009) = 6_885_360 = ~7_000_000
 * This is necessary because javascript does not handle large values too well,
 * and the `/rescanblockchain` errors. Not to mention that a value beyond the current
 * height does not make any sense in the first place.
 */
const MAX_BLOCKHEIGHT_VALUE = 10_000_000

const MIN_GAPLIMIT_VALUE = 1
/**
 * Maximum gaplimit value for importing an existing wallet.
 * This value represents an upper limit based on declining performance of JM when many
 * addresses have to be monitored. On network `regtest`, importing 10_000 addresses in
 * an empty wallet takes ~10min and requesting the `/display` endpoint takes another
 * ~10min. At this point, JM becomes practically unusable. However, goal is to find a
 * balance between usability and freedom of users to do what they are trying to do.
 */
const MAX_GAPLIMIT_VALUE = 10_000

const showDummyMnemonicHelper = isDebugFeatureEnabled('importDummyMnemonicPhrase')

interface ImportDetailsFormValues {
  mnemonicPhrase: string
  blockheight: number
  gaplimit: number
}

const defaultImportDetailsFormValues: ImportDetailsFormValues = isDevMode()
  ? {
      mnemonicPhrase: '',
      blockheight: MIN_BLOCKHEIGHT_VALUE,
      gaplimit: GAPLIMIT_SUGGESTIONS.heavy,
    }
  : {
      mnemonicPhrase: '',
      blockheight: SEGWIT_ACTIVATION_BLOCK,
      gaplimit: GAPLIMIT_SUGGESTIONS.normal,
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
  const invalidBlockheightMessage = t('import_wallet.import_details.feedback_invalid_blockheight', {
    min: MIN_BLOCKHEIGHT_VALUE.toLocaleString(),
  })
  const invalidGaplimitMessage = t('import_wallet.import_details.feedback_invalid_gaplimit', {
    min: MIN_GAPLIMIT_VALUE.toLocaleString(),
    max: MAX_GAPLIMIT_VALUE.toLocaleString(),
  })
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
      blockheight: yup
        .number()
        .integer(invalidBlockheightMessage)
        .min(MIN_BLOCKHEIGHT_VALUE, invalidBlockheightMessage)
        .max(MAX_BLOCKHEIGHT_VALUE, invalidBlockheightMessage)
        .required(invalidBlockheightMessage),
      gaplimit: yup
        .number()
        .integer(invalidGaplimitMessage)
        .min(MIN_GAPLIMIT_VALUE, invalidGaplimitMessage)
        .max(MAX_GAPLIMIT_VALUE, invalidGaplimitMessage)
        .required(invalidGaplimitMessage),
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
    defaultValues: defaultImportDetailsFormValues,
    values: initialValues,
    resolver: yupResolver(schema),
  })
  const watchedSeedPhrase = useWatch({
    control,
    name: 'mnemonicPhrase',
  })
  const watchedGaplimit = useWatch({
    control,
    name: 'gaplimit',
  })
  const isSeedPhraseBip39Valid = useMemo(() => isBip39Mnemonic(watchedSeedPhrase), [watchedSeedPhrase])

  const doOnSubmit = handleSubmit(onSubmit)

  const hasImportDetailsSectionErrors = !!errors.blockheight || !!errors.gaplimit
  const showGaplimitWarning = !errors.gaplimit && watchedGaplimit > GAPLIMIT_WARN_THRESHOLD

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
        {showDummyMnemonicHelper && watchedSeedPhrase !== DUMMY_SEED_PHRASE_STRING && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setValue('mnemonicPhrase', DUMMY_SEED_PHRASE_STRING, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          >
            Use dummy mnemonic <DevBadge />
          </Button>
        )}
      </div>

      <Accordion type="single" collapsible defaultValue="options">
        <AccordionItem value="options">
          <AccordionTrigger
            className={cn({
              'text-destructive': hasImportDetailsSectionErrors,
              'light:text-yellow-800 text-yellow-200/90': !hasImportDetailsSectionErrors && showGaplimitWarning,
            })}
          >
            <div className="flex items-center gap-2">
              {hasImportDetailsSectionErrors && <OctagonAlertIcon />}
              {!hasImportDetailsSectionErrors && showGaplimitWarning && <AlertTriangleIcon />}
              {t('import_wallet.import_details.import_options')}
            </div>
          </AccordionTrigger>
          <AccordionContent className={cn('space-y-2', 'mx-1' /* add x-spacing for input component focus state*/)}>
            <div className="space-y-2">
              <Field data-invalid={errors.blockheight !== undefined}>
                <FieldLabel htmlFor="blockheight">{t('import_wallet.import_details.label_blockheight')}</FieldLabel>
                <FieldDescription className="text-xs">
                  {t('import_wallet.import_details.description_blockheight')}
                </FieldDescription>
                <InputGroup>
                  <InputGroupInput
                    id="blockheight"
                    {...register('blockheight', {
                      required: true,
                      disabled,
                    })}
                    type="number"
                    min={MIN_BLOCKHEIGHT_VALUE}
                    max={MAX_BLOCKHEIGHT_VALUE}
                    step={1}
                  />
                  <InputGroupAddon align="inline-start">
                    <BlocksIcon />
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              {errors.blockheight?.message && (
                <div className="text-destructive text-xs">{errors.blockheight.message}</div>
              )}
            </div>
            <div className="space-y-2">
              <Field data-invalid={errors.gaplimit !== undefined}>
                <FieldLabel htmlFor="gaplimit">{t('import_wallet.import_details.label_gaplimit')}</FieldLabel>
                <FieldDescription className="text-xs">
                  {t('import_wallet.import_details.description_gaplimit')}
                </FieldDescription>
                <InputGroup>
                  <InputGroupInput
                    id="gaplimit"
                    {...register('gaplimit', {
                      required: true,
                      disabled,
                    })}
                    type="number"
                    min={MIN_GAPLIMIT_VALUE}
                    max={MAX_GAPLIMIT_VALUE}
                    step={1}
                  />
                  <InputGroupAddon align="inline-start">
                    <UnfoldHorizontalIcon />
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              {errors.gaplimit?.message && <div className="text-destructive text-xs">{errors.gaplimit.message}</div>}

              {showGaplimitWarning && (
                <Alert variant="warning">
                  <AlertTriangleIcon />
                  <AlertDescription className="whitespace-pre-line">
                    {t('import_wallet.import_details.alert_high_gaplimit_value')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
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
