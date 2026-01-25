import { useMemo, useState, type ComponentProps } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { getaddress, type ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { getAddressInfo, validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import type { AddressInfo } from 'bitcoin-address-validation'
import { BrushCleaningIcon, MilkIcon, XIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as yup from 'yup'
import { isDevMode } from '@/constants/debugFeatures'
import { JM_MINIMUM_MAKERS_DEFAULT } from '@/constants/jm'
import type { Jar } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { BalanceSummary } from '@/lib/balanceSummary'
import { cn, delayedPromise, pseudoRandomInteger, type WalletFileName } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ButtonGroup } from '../ui/button-group'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Field, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { SatSymbol } from '../ui/jam/CurrencySymbol'
import { SelectableJar } from '../ui/jam/SelectableJar'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'
import JarSelectorDialog from './JarSelectorDialog'
import type { SendFormValues } from './types'

type AddressFromJarSelectorDialog = Omit<ComponentProps<typeof JarSelectorDialog>, 'onConfirm'> & {
  walletFileName: WalletFileName
  onError: (error: ErrorMessage) => Promise<void>
  onConfirm: (jar: JarIndex, address: AddressInfo) => Promise<void>
}

const AddressFromJarSelectorDialog = ({
  walletFileName,
  onError,
  onConfirm,
  ...dialogProps
}: AddressFromJarSelectorDialog) => {
  const client = useApiClient()

  return (
    <JarSelectorDialog
      {...dialogProps}
      onConfirm={async (selectedJarIndex) => {
        const result = await delayedPromise(210).then(() =>
          getaddress({
            client,
            path: {
              walletname: encodeURIComponent(walletFileName),
              mixdepth: String(selectedJarIndex),
            },
          }),
        )
        if (result.error) {
          await onError(result.error)
        } else if (result.data?.address === undefined) {
          await onError(new Error('Missing bitcoin address.'))
        } else {
          const addressInfo = getAddressInfo(result.data.address)
          await onConfirm(selectedJarIndex, addressInfo)
        }
      }}
    />
  )
}

const initialNumCollaborators = (minValue: number): number => {
  if (minValue > 8) {
    return minValue + pseudoRandomInteger(0, 2)
  }

  return pseudoRandomInteger(8, 10)
}

// set the default to one collaborator in dev mode
const DEV_INITIAL_NUM_COLLABORATORS_INPUT = 1

const MAX_NUM_COLLABORATORS = 99

// TODO: this value should be dynamic via jm backend settings
const MIN_NUM_COLLABORATORS = isDevMode() ? DEV_INITIAL_NUM_COLLABORATORS_INPUT : JM_MINIMUM_MAKERS_DEFAULT

const FORM_INPUT_DEFAULT_VALUES: SendFormValues = {
  sourceJarIndex: undefined,
  destination: undefined,
  amount: undefined,
  txFee: undefined,
  isCoinJoin: true,
  numCollaborators: undefined,
}

const sendFormSchema = (jars: Jar[], minNumCollaborators: number) => {
  return yup
    .object({
      sourceJarIndex: yup
        .number()
        .integer()
        .test(
          'valid-source-jar-index-test',
          'Invalid source jar index.',
          (value) =>
            (jars.find((it) => it.jarIndex === value)?.balanceSummary.calculatedAvailableBalanceInSats || 0) > 0,
        )
        .required(),
      destination: yup
        .object({
          fromJar: yup.number().optional(),
          address: yup
            .string()
            .test('valid-address-test', 'Invalid bitcoin address.', (value) => {
              return isValidBitcoinAddress(value || '')
            })
            .required(),
        })
        .required(),
      amount: yup
        .object()
        .shape({
          isSweep: yup.boolean().default(false).required(),
          amount: yup.number().when('isSweep', {
            is: (val: boolean) => val === true,
            then: (schema) =>
              schema
                .transform((value) => (Number.isNaN(value) ? null : value))
                .nullable()
                .optional(),
            otherwise: (schema) =>
              schema
                .integer()
                .min(1)
                .max(21_000_000 * 100_000_000)
                .required(),
          }),
        })
        .required(),

      isCoinJoin: yup.boolean().default(FORM_INPUT_DEFAULT_VALUES.isCoinJoin).required(),
      numCollaborators: yup.number().when('isCoinJoin', {
        is: (val: boolean) => val === true,
        then: (schema) =>
          schema
            .integer()
            .default(initialNumCollaborators(minNumCollaborators))
            .min(minNumCollaborators)
            .max(MAX_NUM_COLLABORATORS)
            .required(),
        otherwise: (schema) =>
          schema
            .transform((value) => (Number.isNaN(value) ? null : value))
            .nullable()
            .optional(),
      }),
    })
    .required()
}

const FieldPrefixSatSymbol = (
  <SatSymbol
    width={'18px'}
    height={'18px'}
    style={{
      margin: '5px -1px',
    }}
  />
)

interface SendFormProps {
  className?: string
  onSubmit: SubmitHandler<SendFormValues>
  minNumCollaborators?: number
  walletFileName: WalletFileName
  jars: Jar[]
  walletBalanceSummary: BalanceSummary
  disabled?: boolean
  debug?: boolean
}

export function SendForm({
  className,
  onSubmit,
  disabled,
  walletFileName,
  minNumCollaborators = MIN_NUM_COLLABORATORS,
  jars,
  walletBalanceSummary,
  debug,
}: SendFormProps) {
  const { t } = useTranslation()

  const [showAddressFromJarSelectorDialog, setShowAddressFromJarSelectorDialog] = useState(false)

  const schema = useMemo(() => sendFormSchema(jars, minNumCollaborators), [jars, minNumCollaborators])

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    //getValues,
    setValue,
  } = useForm<SendFormValues, unknown, SendFormValues>({
    mode: 'onSubmit',
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<SendFormValues, unknown, SendFormValues>,
  })

  const values = useWatch({ control })
  const sourceJarIndex = useWatch({ control, name: 'sourceJarIndex' })
  const destinationAddress = useWatch({ control, name: 'destination.address' })
  const destinationDisplayAddress = useWatch({ control, name: 'destination.displayAddress' })
  const destinationJarIndex = useWatch({ control, name: 'destination.fromJar' })
  const isSweep = useWatch({ control, name: 'amount.isSweep' })
  const amountDisplaySweepAmount = useWatch({ control, name: 'amount.displaySweepAmount' })

  const destinationAddressInfo = useMemo(() => {
    try {
      return destinationAddress !== undefined ? getAddressInfo(destinationAddress) : undefined
    } catch (_ignoredOnPurpose) {
      return undefined
    }
  }, [destinationAddress])

  const sourceJar = useMemo(() => {
    return jars.find((it) => it.jarIndex === sourceJarIndex)
  }, [jars, sourceJarIndex])

  const destinationJar = useMemo(() => {
    return destinationJarIndex === undefined ? undefined : jars.find((it) => it.jarIndex === destinationJarIndex)
  }, [jars, destinationJarIndex])

  return (
    <>
      <AddressFromJarSelectorDialog
        open={showAddressFromJarSelectorDialog}
        onOpenChange={setShowAddressFromJarSelectorDialog}
        title={t('send.title_jar_selector')}
        walletFileName={walletFileName}
        jars={jars}
        disabledJars={sourceJar === undefined ? [] : [sourceJar]}
        walletBalanceSummary={walletBalanceSummary}
        onError={async (_ignoredOnPurpose) => {
          // TODO: i18n own key `send.error_loading_address_failed`
          toast.error(t('receive.error_loading_address_failed'))
          setValue('destination.address', undefined, { shouldValidate: true })
          setValue('destination.fromJar', undefined, { shouldValidate: true })
        }}
        onConfirm={async (jarIndex, addressInfo) => {
          setValue('destination.address', addressInfo.address, { shouldValidate: true })
          setValue('destination.fromJar', jarIndex, { shouldValidate: true })

          const jar = jars.find((it) => it.jarIndex === jarIndex)
          const displayAddress = `${jar?.name} (${addressInfo.address})`
          setValue('destination.displayAddress', displayAddress, { shouldValidate: false })

          setShowAddressFromJarSelectorDialog(false)
        }}
      />
      <form onSubmit={handleSubmit(onSubmit)} className={cn('flex flex-col gap-4', className)}>
        <div className="space-y-2">
          <Field className="space-y-4" data-invalid={errors.sourceJarIndex !== undefined}>
            <FieldLabel>{t('send.label_source_jar')}</FieldLabel>
            <div className="grid grid-cols-5 gap-4">
              {jars.map((jar, index) => (
                <SelectableJar
                  key={index}
                  name={jar.name}
                  color={jar.color}
                  balance={jar.balanceSummary.calculatedTotalBalanceInSats}
                  totalBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
                  isSelected={sourceJarIndex === jar.jarIndex}
                  onClick={() => {
                    setValue('sourceJarIndex', jar.jarIndex)

                    if (isSweep) {
                      setValue('amount.isSweep', false, { shouldValidate: true })
                      setValue('amount.displaySweepAmount', undefined, { shouldValidate: false })
                      setValue('amount.amount', undefined, { shouldValidate: true })
                    }
                    if (destinationJarIndex === jar.jarIndex) {
                      setValue('destination.address', undefined, { shouldValidate: true })
                      setValue('destination.fromJar', undefined, { shouldValidate: true })
                    }
                  }}
                  disabled={disabled || jar.balanceSummary.calculatedAvailableBalanceInSats <= 0}
                />
              ))}
            </div>
          </Field>

          {errors.sourceJarIndex && (
            <div className="text-destructive text-xs">{t('send.feedback_invalid_source_jar')}</div>
          )}
        </div>

        <div className="space-y-2">
          <Field data-invalid={errors.destination !== undefined}>
            <FieldLabel htmlFor="send-destination">
              {t('send.label_recipient')}
              {destinationAddressInfo?.network && destinationAddressInfo.network !== 'mainnet' && (
                <Badge variant="outline">{destinationAddressInfo.network}</Badge>
              )}
            </FieldLabel>
            <ButtonGroup
              className={cn({
                hidden: destinationJar !== undefined,
              })}
            >
              <Input
                id="send-destination"
                {...register('destination.address', {
                  required: destinationJar === undefined,
                  disabled,
                })}
                type="text"
                placeholder={t('send.placeholder_recipient')}
              />

              <Button
                id="show-address-from-jar-selector-trigger"
                type="button"
                size="icon"
                disabled={disabled}
                onClick={() => setShowAddressFromJarSelectorDialog(true)}
              >
                <MilkIcon />
              </Button>
            </ButtonGroup>
            <ButtonGroup
              className={cn({
                hidden: destinationJar === undefined,
              })}
            >
              <Input
                id="send-destination-address-from-jar"
                type="text"
                value={destinationDisplayAddress || ''}
                disabled={disabled}
                readOnly
              />

              <Button
                id="clear-address-from-jar-selector-trigger"
                type="button"
                size="icon"
                variant="outline"
                disabled={disabled}
                onClick={() => {
                  setValue('destination.address', undefined, { shouldValidate: true })
                  setValue('destination.fromJar', undefined, { shouldValidate: true })
                }}
              >
                <XIcon />
              </Button>
            </ButtonGroup>
          </Field>

          {errors.destination && (
            <>
              <div className="text-destructive text-xs">{t('send.feedback_invalid_destination_address')}</div>
              {/* TODO: feedback_invalid_source_jar */}
              {/* TODO: feedback_reused_address */}
            </>
          )}
        </div>

        <div className="space-y-2">
          <Field data-invalid={errors.amount !== undefined}>
            <FieldLabel htmlFor="send-amount">{t('send.label_amount_input')}</FieldLabel>

            <ButtonGroup
              className={cn('relative', {
                hidden: isSweep === true,
              })}
            >
              <Input
                id="send-amount"
                {...register('amount.amount', {
                  required: false,
                  disabled,
                })}
                type="number"
                className="pl-9"
                placeholder={t('send.placeholder_amount_input')}
              />
              <div className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center px-3">
                {FieldPrefixSatSymbol}
              </div>
              <Button
                id="btn-sweep-trigger"
                type="button"
                disabled={
                  disabled || sourceJar === undefined || sourceJar.balanceSummary.calculatedAvailableBalanceInSats <= 0
                }
                onClick={() => {
                  setValue('amount.isSweep', true, { shouldValidate: true })
                  const displayAmount = `${sourceJar?.name} (${sourceJar?.balanceSummary.calculatedAvailableBalanceInSats})`
                  setValue('amount.displaySweepAmount', displayAmount, { shouldValidate: false })

                  setValue('amount.amount', undefined, { shouldValidate: true })
                }}
              >
                <BrushCleaningIcon /> {t('send.button_sweep')}
              </Button>
            </ButtonGroup>

            <ButtonGroup
              className={cn('relative', {
                hidden: isSweep !== true,
              })}
            >
              <Input
                id="send-amount-sweep-from-jar"
                className="pl-9"
                type="text"
                value={amountDisplaySweepAmount || ''}
                disabled={disabled}
                readOnly
              />
              <div className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center px-3">
                {FieldPrefixSatSymbol}
              </div>
              <Button
                id="btn-sweep-clear-trigger"
                type="button"
                disabled={disabled}
                onClick={() => {
                  setValue('amount.isSweep', false, { shouldValidate: true })
                  setValue('amount.displaySweepAmount', undefined, { shouldValidate: false })

                  setValue('amount.amount', undefined, { shouldValidate: true })
                }}
              >
                <XIcon /> {t('send.button_clear_sweep')}
              </Button>
            </ButtonGroup>
          </Field>
          {errors.amount?.amount && <div className="text-destructive text-xs">{t('send.feedback_invalid_amount')}</div>}
        </div>

        <Accordion type="single" collapsible>
          <AccordionItem value="options">
            <AccordionTrigger>{t('send.sending_options')}</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="switch-is-collaborative-transaction"
                    checked={values.isCoinJoin}
                    onCheckedChange={(checked) =>
                      setValue('isCoinJoin', checked, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    disabled={disabled}
                  />
                  <Label htmlFor="switch-is-collaborative-transaction" className="flex flex-col items-start gap-0">
                    <div className="font-medium">{t('send.toggle_coinjoin')}</div>
                    <div className="text-muted-foreground text-sm">{t('send.toggle_coinjoin_subtitle')}</div>
                  </Label>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button
          type="submit"
          variant={disabled ? 'outline' : values.isCoinJoin !== true ? 'destructive' : undefined}
          disabled={disabled || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Spinner className="motion-reduce:hidden" />
              {t('send.text_sending')}
            </>
          ) : (
            <>
              {values.isCoinJoin !== true ? (
                <>{t('send.button_send_without_improved_privacy')}</>
              ) : (
                <>{t('send.button_send')}</>
              )}
            </>
          )}
        </Button>

        {debug && (
          <Card className="mt-8">
            <CardHeader className="grid">
              <DevBadge className="justify-self-end" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="overflow-scroll">
                <code className="light:text-red-700 text-red-800">isValid:</code>
                <pre className="text-xs">{JSON.stringify(isValid, null, 2)}</pre>
              </div>
              <div className="overflow-scroll">
                <code className="light:text-red-700 text-red-800">values:</code>
                <pre className="text-xs">{JSON.stringify(values, null, 2)}</pre>
              </div>
              <div className="overflow-scroll">
                <code className="light:text-red-700 text-red-800">schema:</code>
                <pre className="text-xs">{JSON.stringify(schema, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </>
  )
}
