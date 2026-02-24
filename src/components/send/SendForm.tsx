import { useCallback, useMemo, useState, type ComponentProps } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { getaddress, type ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { getAddressInfo, validate as isValidBitcoinAddress, Network } from 'bitcoin-address-validation'
import type { AddressInfo } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import { BrushCleaningIcon, MilkIcon, ScanQrCodeIcon, XIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as yup from 'yup'
import QrScannerDialog from '@/components/ui/QrScannerDialog'
import { isDevMode } from '@/constants/debugFeatures'
import { JM_MINIMUM_MAKERS_DEFAULT } from '@/constants/jm'
import { useDetectNetwork, type AddressSummary, type Jar } from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { BalanceSummary } from '@/lib/balanceSummary'
import { parseBip21Uri, type Bip21ParseResult } from '@/lib/bip21'
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
import { inputVariants } from '../ui/input-variants'
import { Balance } from '../ui/jam/Balance'
import { SatSymbol } from '../ui/jam/CurrencySymbol'
import { SelectableJar } from '../ui/jam/SelectableJar'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'
import JarSelectorDialog from './JarSelectorDialog'
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
              walletname: encodeURIComponent(walletFileName),
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

const initialNumberOfCollaborators = (minValue: number): number => {
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

const FORM_INPUT_DEFAULT_VALUES: Partial<SendFormValues> = {
  source: undefined,
  destination: undefined,
  amount: undefined,
  txFee: undefined,
  isCoinJoin: true,
  numCollaborators: undefined,
}

const sendFormSchema = (
  jars: Jar[],
  addressSummary: AddressSummary,
  minNumberOfCollaborators: number,
  network: Network,
  t: TFunction,
) => {
  return yup
    .object({
      source: yup
        .object({
          fromJar: yup
            .number()
            .integer(t('send.feedback_invalid_source_jar'))
            .required(t('send.feedback_invalid_source_jar'))
            .test(
              'valid-source-jar-index-test',
              t('send.feedback_invalid_source_jar'),
              (value) =>
                (jars.find((it) => it.jarIndex === value)?.balanceSummary.calculatedAvailableBalanceInSats || 0) > 0,
            ),
        })
        .required(),
      destination: yup
        .object({
          fromJar: yup.number().optional(),
          address: yup
            .string()
            .required(t('send.feedback_invalid_destination_address'))
            .test('valid-address-test', t('send.feedback_invalid_destination_address'), (value) => {
              return isValidBitcoinAddress(value)
            })
            .test('network-mismatch-test', t('send.feedback_destination_network_mismatch'), (value) => {
              try {
                return getAddressInfo(value).network === network
              } catch (_ignoredOnPurpose) {
                return false
              }
            })
            .test('reused-address-test', t('send.feedback_reused_address'), (value) => {
              return addressSummary[value]?.used !== true
            }),
        })
        .required(),
      amount: yup
        .object()
        .shape({
          isSweep: yup.boolean().default(false).required(),
          sweepAmount: yup.number().when('isSweep', {
            is: (val: boolean) => val === true,
            then: (schema) =>
              schema
                .integer()
                .min(1)
                .max(21_000_000 * 100_000_000)
                .required(),
            otherwise: (schema) =>
              schema
                .transform(() => null)
                .nullable()
                .optional(),
          }),
          amount: yup.number().when('isSweep', {
            is: (val: boolean) => val === true,
            then: (schema) =>
              schema
                .transform(() => null)
                .nullable()
                .optional(),
            otherwise: (schema) =>
              schema
                .integer(t('send.feedback_invalid_amount'))
                .transform((value) => (Number.isSafeInteger(value) ? Number(value) : null))
                .nonNullable(t('send.feedback_invalid_amount'))
                .min(1, t('send.feedback_invalid_amount'))
                .max(21_000_000 * 100_000_000, t('send.feedback_invalid_amount'))
                .required(t('send.feedback_invalid_amount')),
          }),
        })
        .required(),
      isCoinJoin: yup.boolean().default(FORM_INPUT_DEFAULT_VALUES.isCoinJoin).required(),
      numCollaborators: yup.number().when('isCoinJoin', {
        is: (val: boolean) => val === true,
        then: (schema) =>
          schema
            .integer()
            .default(initialNumberOfCollaborators(minNumberOfCollaborators))
            .min(minNumberOfCollaborators)
            .max(MAX_NUM_COLLABORATORS)
            .required(),
        otherwise: (schema) =>
          schema
            .transform(() => null)
            .nullable()
            .optional(),
      }),
    })
    .required()
    .test('address-not-from-source-jar-test', function (root) {
      const addressIsFromSourceJar = addressSummary[root.destination.address]?.jarIndex === root.source.fromJar
      if (!addressIsFromSourceJar) return true

      const errorMessage = t('send.feedback_address_from_source_jar', {
        /* TODO: i18n: remove defaultValue and add key to language files */
        defaultValue: 'This address is from the source jar. To preserve your privacy please choose a different one.',
      })

      return new yup.ValidationError(errorMessage, root.destination.address, 'destination.address', undefined, true)
    })
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
  minNumberOfCollaborators?: number
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
  disabled,
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
    () => sendFormSchema(jars, addressSummary, minNumberOfCollaborators, network, t),
    [jars, addressSummary, minNumberOfCollaborators, network, t],
  )

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
    trigger,
  } = useForm<SendFormValues, unknown, SendFormValues>({
    mode: 'onSubmit',
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<SendFormValues, unknown, SendFormValues>,
  })

  const values = useWatch({ control })
  const sourceJarIndex = useWatch({ control, name: 'source.fromJar' })
  const destinationAddress = useWatch({ control, name: 'destination.address' })
  const destinationJarIndex = useWatch({ control, name: 'destination.fromJar' })
  const isSweep = useWatch({ control, name: 'amount.isSweep' })

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

  const destinationJar = useMemo(() => {
    if (destinationJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === destinationJarIndex)
  }, [jars, destinationJarIndex])

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
      <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
        <div className="space-y-2">
          <Field className="space-y-4" data-invalid={errors.source !== undefined}>
            <FieldLabel>{t('send.label_source_jar')}</FieldLabel>
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
              <div
                id="send-destination-address-from-jar"
                className={cn(
                  inputVariants(),
                  'flex items-center justify-between gap-2',
                  'bg-input/50 dark:bg-input/80 h-auto',
                )}
              >
                <span className="font-mono break-all select-all">{values.destination?.address}</span>
                <Badge className="text-sm" variant="default">
                  {destinationJar?.name} <span className="text-xs">#{destinationJar?.jarIndex}</span>
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
                  disabled || sourceJar === undefined || sourceJar.balanceSummary.calculatedAvailableBalanceInSats <= 0
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
          size="xxl"
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
                <code className="light:text-red-700 text-red-800">errors:</code>
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
