import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { getaddress, type ErrorMessage } from '@joinmarket-webui/joinmarket-ng-api-ts/jm'
import { getAddressInfo, Network } from 'bitcoin-address-validation'
import type { AddressInfo } from 'bitcoin-address-validation'
import { AlertTriangleIcon, BrushCleaningIcon, MilkIcon, ScanQrCodeIcon, XIcon } from 'lucide-react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import QrScannerDialog from '@/components/ui/QrScannerDialog'
import { isDevMode } from '@/constants/debugFeatures'
import { MAX_NUM_COLLABORATORS } from '@/constants/jam'
import { JM_MINIMUM_MAKERS_DEFAULT } from '@/constants/jm'
import { useDetectNetwork, type AddressSummary, type Jar } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { BalanceSummary } from '@/lib/balanceSummary'
import { parseBip21Uri, type Bip21ParseResult } from '@/lib/bip21'
import type { JamFeeConfigValues } from '@/lib/feeConfig'
import { cn, delayedPromise, factorToPercentage, type WalletFileName } from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { buildSweepPreconditionSummary } from '../sweep/preconditions'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ButtonGroup } from '../ui/button-group'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { inputVariants } from '../ui/input-variants'
import { Address } from '../ui/jam/Address'
import { Balance } from '../ui/jam/Balance'
import { SatSymbol } from '../ui/jam/CurrencySymbol'
import { SelectableJar } from '../ui/jam/SelectableJar'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'
import JarSelectorDialog from './JarSelectorDialog'
import { SendCoinjoinPreconditionAlert } from './SendCoinjoinPreconditionAlert'
import {
  createSendFormSchema,
  initialNumberOfCollaborators,
  MAX_SEND_AMOUNT,
  MIN_SEND_AMOUNT,
  toSendFormDefaultValues,
} from './SendForm.schema'
import { TxFeeForm } from './TxFeeForm'
import { estimateMaxCollaboratorFee } from './feeEstimate'
import type { SendFormValues } from './types'

type AddressFromJarSelectorDialog = Omit<ComponentProps<typeof JarSelectorDialog>, 'onConfirm'> & {
  walletFileName: WalletFileName
  onError: (error: ErrorMessage) => void
  onConfirm: (jar: JarIndex, address: AddressInfo) => void
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
              walletname: walletFileName,
              mixdepth: String(selectedJarIndex),
            },
          }),
        )
        if (result.error) {
          onError(result.error)
        } else if (result.data?.address === undefined) {
          // TODO: i18n? does this ever happen?
          onError(new Error('Missing bitcoin address.'))
        } else {
          const addressInfo = getAddressInfo(result.data.address)
          onConfirm(selectedJarIndex, addressInfo)
        }
      }}
    />
  )
}

// set the default to one collaborator in dev mode
const DEV_INITIAL_NUM_COLLABORATORS_INPUT = 1

// TODO: this value should be dynamic via jm backend settings
const MIN_NUM_COLLABORATORS = isDevMode() ? DEV_INITIAL_NUM_COLLABORATORS_INPUT : JM_MINIMUM_MAKERS_DEFAULT

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
  onSourceJarChange?: (jarIndex: JarIndex | undefined) => void
  sourceJarLabelButton?: React.ReactElement
  minNumberOfCollaborators?: number
  feeConfigValues: JamFeeConfigValues
  walletFileName: WalletFileName
  jars: Jar[]
  walletBalanceSummary: BalanceSummary
  addressSummary: AddressSummary
  disabled?: boolean
  debug?: boolean
}

export function SendForm({
  className,
  onSubmit,
  onSourceJarChange,
  sourceJarLabelButton,
  disabled,
  feeConfigValues,
  walletFileName,
  minNumberOfCollaborators = MIN_NUM_COLLABORATORS,
  jars,
  walletBalanceSummary,
  addressSummary,
  debug,
}: SendFormProps) {
  const { t } = useTranslation()

  const [showAddressFromJarSelectorDialog, setShowAddressFromJarSelectorDialog] = useState(false)
  const [showQrScannerDialog, setShowQrScannerDialog] = useState(false)
  const [bip21Message, setBip21Message] = useState<string>()

  const { network } = useDetectNetwork()

  const schema = useMemo(
    () => createSendFormSchema(jars, addressSummary, minNumberOfCollaborators, network, t),
    [jars, addressSummary, minNumberOfCollaborators, network, t],
  )

  const defaultValues = useMemo<Partial<SendFormValues>>(() => {
    return toSendFormDefaultValues({ minNumberOfCollaborators, feeConfigValues })
  }, [minNumberOfCollaborators, feeConfigValues])

  const { control, register, handleSubmit, formState, setValue, trigger, ...sendFormMethods } = useForm<
    SendFormValues,
    unknown,
    SendFormValues
  >({
    mode: 'onSubmit',
    disabled,
    defaultValues,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<SendFormValues, unknown, SendFormValues>,
  })
  const { errors, isValid, isSubmitting } = useMemo(
    () => ({
      errors: formState.errors,
      isValid: formState.isValid,
      isSubmitting: formState.isSubmitting,
    }),
    [formState.errors, formState.isValid, formState.isSubmitting],
  )
  const collapsibleFormElementsValid = useMemo(
    () => errors.numCollaborators === undefined && errors.txFee === undefined,
    [errors.numCollaborators, errors.txFee],
  )

  const values = useWatch({ control })
  const sourceJarIndex = useWatch({ control, name: 'source.fromJar' })
  const destinationAddress = useWatch({ control, name: 'destination.address' })
  const destinationJarIndex = useWatch({ control, name: 'destination.fromJar' })
  const isSweep = useWatch({ control, name: 'amount.isSweep' })
  const isCoinJoin = useWatch({ control, name: 'isCoinJoin' })
  const collaboratorCount = useWatch({ control, name: 'numCollaborators' })

  const destinationAddressInfo = useMemo(() => {
    try {
      return destinationAddress !== undefined ? getAddressInfo(destinationAddress) : undefined
    } catch (_ignoredOnPurpose) {
      return undefined
    }
  }, [destinationAddress])

  const sourceJar = useMemo(() => {
    if (sourceJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === sourceJarIndex)
  }, [jars, sourceJarIndex])

  useEffect(() => {
    onSourceJarChange?.(sourceJarIndex)
  }, [onSourceJarChange, sourceJarIndex])

  const destinationJar = useMemo(() => {
    if (destinationJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === destinationJarIndex)
  }, [jars, destinationJarIndex])

  const coinjoinPreconditionSummary = useMemo(() => {
    if (!sourceJar) return undefined
    return buildSweepPreconditionSummary(sourceJar.utxos)
  }, [sourceJar])

  const hasCoinjoinPreconditionWarning = isCoinJoin && coinjoinPreconditionSummary?.isFulfilled === false

  const amountForFeeEstimate = useMemo(() => {
    if (values.amount?.isSweep === true) {
      return sourceJar?.balanceSummary.calculatedAvailableBalanceInSats
    }
    return values.amount?.amount
  }, [sourceJar, values.amount?.amount, values.amount?.isSweep])

  const estimatedMaxCollaboratorFee = useMemo(() => {
    if (!isCoinJoin || values.numCollaborators === undefined || amountForFeeEstimate === undefined) {
      return undefined
    }

    try {
      return estimateMaxCollaboratorFee(feeConfigValues, amountForFeeEstimate, values.numCollaborators)
    } catch (_ignoredOnPurpose) {
      return undefined
    }
  }, [amountForFeeEstimate, feeConfigValues, isCoinJoin, values.numCollaborators])

  const doOnSubmit = handleSubmit(onSubmit)

  const applyBip21Result = useCallback(
    (result: Bip21ParseResult) => {
      setValue('destination.address', result.address, { shouldValidate: true })
      setValue('destination.fromJar', undefined, { shouldValidate: true })
      if (result.amount !== undefined) {
        setValue('amount.amount', result.amount, { shouldValidate: true })
        setValue('amount.isSweep', false, { shouldValidate: true })
      }
      setBip21Message(result.message)
    },
    [setValue],
  )

  const handleAddressPaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      const pasted = event.clipboardData.getData('text')
      if (!pasted.toLowerCase().startsWith('bitcoin:')) return

      const parsed = parseBip21Uri(pasted)
      if (!parsed) return

      event.preventDefault()
      applyBip21Result(parsed)
      toast.success(t('send.qr_scan_bip21_applied'))
    },
    [applyBip21Result, t],
  )

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
        onError={(_ignoredOnPurpose) => {
          // TODO: i18n own key `send.error_loading_address_failed`
          toast.error(t('receive.error_loading_address_failed'))
          setValue('destination.address', '', { shouldValidate: true })
          setValue('destination.fromJar', undefined, { shouldValidate: true })
        }}
        onConfirm={(jarIndex, addressInfo) => {
          setValue('destination.address', addressInfo.address, { shouldValidate: true })
          setValue('destination.fromJar', jarIndex, { shouldValidate: true })

          setShowAddressFromJarSelectorDialog(false)
        }}
      />
      <QrScannerDialog open={showQrScannerDialog} onOpenChange={setShowQrScannerDialog} onScan={applyBip21Result} />

      <FormProvider
        control={control}
        register={register}
        handleSubmit={handleSubmit}
        formState={formState}
        setValue={setValue}
        trigger={trigger}
        {...sendFormMethods}
      >
        <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
          <div className="space-y-2">
            <Field className="space-y-4" data-invalid={errors.source !== undefined}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel>{t('send.label_source_jar')}</FieldLabel>
                {sourceJarLabelButton && <>{sourceJarLabelButton}</>}
              </div>
              <div className="grid grid-cols-5 gap-4">
                {jars.map((jar, index) => (
                  <SelectableJar
                    key={index}
                    name={jar.name}
                    color={jar.color}
                    totalBalance={jar.balanceSummary.calculatedTotalBalanceInSats}
                    availableBalance={jar.balanceSummary.calculatedAvailableBalanceInSats}
                    frozenOrLockedBalance={jar.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
                    totalWalletBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
                    isSelected={sourceJarIndex === jar.jarIndex}
                    onClick={() => {
                      setValue('source.fromJar', jar.jarIndex, { shouldValidate: true })

                      if (isSweep === true) {
                        setValue('amount.isSweep', false, { shouldValidate: true })
                        setValue('amount.sweepAmount', undefined, { shouldValidate: true })
                        setValue('amount.amount', undefined, { shouldValidate: true })
                      }
                      if (destinationJarIndex === jar.jarIndex) {
                        setValue('destination.address', '', { shouldValidate: true })
                        setValue('destination.fromJar', undefined, { shouldValidate: true })
                      } else if (destinationAddress !== undefined) {
                        void trigger('destination.address')
                      }
                    }}
                    disabled={disabled || jar.balanceSummary.calculatedAvailableBalanceInSats <= 0}
                  />
                ))}
              </div>
            </Field>
            {errors.source?.fromJar?.message && (
              <div className="text-destructive text-xs">{errors.source?.fromJar.message}</div>
            )}
            {hasCoinjoinPreconditionWarning && coinjoinPreconditionSummary && (
              <SendCoinjoinPreconditionAlert summary={coinjoinPreconditionSummary} />
            )}
          </div>

          <div className="space-y-2">
            <Field data-invalid={errors.destination !== undefined}>
              <FieldLabel htmlFor="send-destination">
                {t('send.label_recipient')}
                {destinationAddressInfo?.network && destinationAddressInfo.network !== Network.mainnet && (
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
                  className="h-auto"
                  type="text"
                  placeholder={t('send.placeholder_recipient')}
                  onPaste={handleAddressPaste}
                />

                <Button
                  id="show-qr-scanner-trigger"
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={disabled}
                  onClick={() => setShowQrScannerDialog(true)}
                >
                  <ScanQrCodeIcon />
                  <span className="sr-only">{t('send.qr_scan_title')}</span>
                </Button>
                <Button
                  id="show-address-from-jar-selector-trigger"
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={disabled}
                  onClick={() => setShowAddressFromJarSelectorDialog(true)}
                >
                  <MilkIcon />
                  <span className="sr-only">{/* TODO: i18n */} Choose Jar</span>
                </Button>
              </ButtonGroup>
              <ButtonGroup
                className={cn({
                  hidden: destinationJar === undefined,
                })}
              >
                {destinationJar === undefined || !values.destination?.address ? undefined : (
                  <>
                    <div
                      id="send-destination-address-from-jar"
                      className={cn(
                        inputVariants(),
                        'flex items-center justify-between gap-2',
                        'bg-input/50 dark:bg-input/80 h-auto',
                      )}
                    >
                      <Address value={values.destination.address} copyable={true} />
                      <Badge className="text-sm" variant="default">
                        {destinationJar.name} <span className="text-xs">#{destinationJar.jarIndex}</span>
                      </Badge>
                    </div>

                    <Button
                      id="clear-address-from-jar-selector-trigger"
                      type="button"
                      variant="outline"
                      size="lg"
                      className="h-auto"
                      disabled={disabled}
                      onClick={() => {
                        setValue('destination.address', '', { shouldValidate: true })
                        setValue('destination.fromJar', undefined, { shouldValidate: true })
                      }}
                    >
                      <XIcon /> {t('global.clear')}
                    </Button>
                  </>
                )}
              </ButtonGroup>
            </Field>

            {errors.destination?.address?.message && (
              <>
                <div className="text-destructive text-xs">{errors.destination.address.message}</div>
                {/* TODO: feedback_invalid_source_jar */}
              </>
            )}
            {errors.destination?.fromJar?.message && (
              <div className="text-destructive text-xs">{errors.destination.fromJar.message}</div>
            )}
            {bip21Message && <div className="text-muted-foreground text-xs">{bip21Message}</div>}
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
                  min={MIN_SEND_AMOUNT}
                  max={MAX_SEND_AMOUNT}
                  type="number"
                  className="h-auto pl-9"
                  placeholder={t('send.placeholder_amount_input')}
                />
                <div className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center px-3">
                  {FieldPrefixSatSymbol}
                </div>
                <Button
                  id="btn-sweep-trigger"
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={
                    disabled ||
                    sourceJar === undefined ||
                    sourceJar.balanceSummary.calculatedAvailableBalanceInSats <= 0
                  }
                  onClick={() => {
                    setValue('amount.isSweep', true, { shouldValidate: true })
                    setValue('amount.sweepAmount', sourceJar?.balanceSummary.calculatedAvailableBalanceInSats, {
                      shouldValidate: true,
                    })
                    setValue('amount.amount', undefined, { shouldValidate: true })
                  }}
                >
                  <BrushCleaningIcon /> {t('send.button_sweep')}
                </Button>
              </ButtonGroup>

              <ButtonGroup
                className={cn({
                  hidden: isSweep !== true,
                })}
              >
                <div
                  id="send-amount-sweep-from-jar"
                  className={cn(
                    inputVariants(),
                    'flex items-center justify-between gap-2',
                    'bg-input/50 dark:bg-input/80 h-auto',
                  )}
                  aria-disabled
                >
                  {values.amount?.sweepAmount !== undefined && (
                    <Balance valueString={values.amount.sweepAmount.toFixed(0)} />
                  )}

                  <Badge className="text-sm" variant="default">
                    {sourceJar?.name} <span className="text-xs">#{sourceJar?.jarIndex}</span>
                  </Badge>
                </div>

                <Button
                  id="btn-sweep-clear-trigger"
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-auto"
                  disabled={disabled}
                  onClick={() => {
                    setValue('amount.isSweep', false, { shouldValidate: true })
                    setValue('amount.sweepAmount', undefined, { shouldValidate: true })
                    setValue('amount.amount', undefined, { shouldValidate: true })
                  }}
                >
                  <XIcon /> {t('send.button_clear_sweep')}
                </Button>
              </ButtonGroup>
            </Field>
            {errors.amount?.amount?.message && (
              <div className="text-destructive text-xs">{errors.amount.amount.message}</div>
            )}
            {errors.amount?.sweepAmount?.message && (
              <div className="text-destructive text-xs">{errors.amount.sweepAmount.message}</div>
            )}
            {errors.amount?.isSweep?.message && (
              <div className="text-destructive text-xs">{errors.amount.isSweep.message}</div>
            )}
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="options">
              <AccordionTrigger
                className={cn({
                  'text-destructive': !collapsibleFormElementsValid,
                })}
              >
                <div className="flex items-center gap-2">
                  {!collapsibleFormElementsValid ? <AlertTriangleIcon /> : null}
                  {t('send.sending_options')}
                </div>
              </AccordionTrigger>

              <AccordionContent
                className={cn('flex flex-col gap-6', 'mx-1' /* add x-spacing for input component focus state*/)}
              >
                <div className="flex items-center gap-2">
                  <Switch
                    id="switch-is-collaborative-transaction"
                    checked={isCoinJoin}
                    onCheckedChange={(checked) => {
                      setValue('isCoinJoin', checked, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                      setValue(
                        'numCollaborators',
                        checked
                          ? (collaboratorCount ?? initialNumberOfCollaborators(minNumberOfCollaborators))
                          : undefined,
                        {
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true,
                        },
                      )
                    }}
                    disabled={disabled}
                  />
                  <Label htmlFor="switch-is-collaborative-transaction" className="flex flex-col items-start gap-0">
                    <div className="font-medium">{t('send.toggle_coinjoin')}</div>
                    <div className="text-muted-foreground text-sm">{t('send.toggle_coinjoin_subtitle')}</div>
                  </Label>
                </div>

                {isCoinJoin && (
                  <div className="space-y-2">
                    <Field data-invalid={errors.numCollaborators !== undefined}>
                      <FieldLabel htmlFor="send-num-collaborators">
                        {t('send.label_num_collaborators', {
                          numCollaborators: values.numCollaborators ?? '?',
                        })}
                      </FieldLabel>
                      <FieldDescription>{t('send.description_num_collaborators')}</FieldDescription>
                      <Input
                        id="send-num-collaborators"
                        {...register('numCollaborators', {
                          required: values.isCoinJoin,
                          disabled,
                          valueAsNumber: true,
                        })}
                        type="number"
                        min={minNumberOfCollaborators}
                        max={MAX_NUM_COLLABORATORS}
                        placeholder={t('send.input_num_collaborators_placeholder')}
                      />
                    </Field>
                    {estimatedMaxCollaboratorFee && (
                      <div className="text-muted-foreground inline-flex items-center text-xs">
                        <span className="mr-1">{t('send.fee_breakdown.title', { maxCollaboratorFee: '≤' })}</span>
                        <span className="text-foreground inline-flex items-center gap-1">
                          <Balance valueString={String(estimatedMaxCollaboratorFee.maxFee)} />
                        </span>
                        <span className="ml-1">
                          ({factorToPercentage(estimatedMaxCollaboratorFee.fractionOfAmount)}%)
                        </span>
                      </div>
                    )}
                    {errors.numCollaborators?.message && (
                      <div className="text-destructive text-xs">{errors.numCollaborators.message}</div>
                    )}
                  </div>
                )}
                <TxFeeForm />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Button
            type="submit"
            variant={
              disabled
                ? 'outline'
                : !isCoinJoin
                  ? 'destructive'
                  : hasCoinjoinPreconditionWarning
                    ? 'secondary'
                    : undefined
            }
            disabled={disabled || isSubmitting}
            className="w-full"
            size="xxl"
          >
            {isSubmitting ? (
              <>
                <Spinner className="motion-reduce:hidden" />
                {t('send.text_sending')}
              </>
            ) : (
              <>
                {!isCoinJoin ? (
                  <>{t('send.button_send_without_improved_privacy')}</>
                ) : hasCoinjoinPreconditionWarning ? (
                  <>{t('send.button_send_despite_warning')}</>
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
                  <code className="text-destructive">isValid:</code>
                  <pre className="text-xs">{JSON.stringify(isValid, null, 2)}</pre>
                </div>
                <div className="overflow-scroll">
                  <code className="text-destructive">values:</code>
                  <pre className="text-xs">{JSON.stringify(values, null, 2)}</pre>
                </div>
                <div className="overflow-scroll">
                  <code className="text-destructive">errors:</code>
                  <pre className="text-xs">{JSON.stringify(errors.source?.message, null, 2)}</pre>
                  <pre className="text-xs">{JSON.stringify(errors.source?.fromJar?.message, null, 2)}</pre>

                  <pre className="text-xs">{JSON.stringify(errors.destination?.message, null, 2)}</pre>
                  <pre className="text-xs">{JSON.stringify(errors.destination?.address?.message, null, 2)}</pre>
                  <pre className="text-xs">{JSON.stringify(errors.destination?.fromJar?.message, null, 2)}</pre>

                  <pre className="text-xs">{JSON.stringify(errors.amount?.message, null, 2)}</pre>
                  <pre className="text-xs">{JSON.stringify(errors.amount?.amount?.message, null, 2)}</pre>
                  <pre className="text-xs">{JSON.stringify(errors.amount?.isSweep?.message, null, 2)}</pre>
                </div>
                <div className="overflow-scroll">
                  <code className="text-destructive">schema:</code>
                  <pre className="text-xs">{JSON.stringify(schema, null, 2)}</pre>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </FormProvider>
    </>
  )
}
