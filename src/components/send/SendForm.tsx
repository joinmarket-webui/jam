import { useMemo, useState, type ComponentProps } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { getaddress, type ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { getAddressInfo, validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import type { AddressInfo } from 'bitcoin-address-validation'
import { MilkIcon, XIcon } from 'lucide-react'
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
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Input } from '../ui/input'
import { SatSymbol } from '../ui/jam/CurrencySymbol'
import { SelectableJar } from '../ui/jam/SelectableJar'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
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
            .test('valid-address-test', 'Invalid bitcoin address.', (value) => isValidBitcoinAddress(value || ''))
            .required(),
        })
        .required(),
      amount: yup
        .object({
          isSweep: yup.boolean().default(false).required(),
          amount: yup
            .number()
            .integer()
            .when('isSweep', {
              is: (val: boolean) => val === true,
              then: (schema) => schema.min(0).max(0).optional(),
              otherwise: (schema) =>
                schema
                  .min(1)
                  .max(21_000_000 * 100_000_000)
                  .required(),
            }),
        })
        .required(),

      isCoinJoin: yup.boolean().default(FORM_INPUT_DEFAULT_VALUES.isCoinJoin).required(),
      numCollaborators: yup
        .number()
        .integer()
        .when('isCoinJoin', {
          is: (val: boolean) => val === true,
          then: (schema) =>
            schema
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
  const destinationJarIndex = useWatch({ control, name: 'destination.fromJar' })

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
        title="title"
        subtitle="subtitle"
        walletFileName={walletFileName}
        jars={jars}
        disabledJars={sourceJar === undefined ? [] : [sourceJar]}
        walletBalanceSummary={walletBalanceSummary}
        onError={async (_ignoredOnPurpose) => {
          // TODO: i18n own key `send.error_loading_address_failed`
          toast.error(t('receive.error_loading_address_failed'))
          setValue('destination.address', undefined)
          setValue('destination.fromJar', undefined)
        }}
        onConfirm={async (jarIndex, addressInfo) => {
          await delayedPromise(333)
          setValue('destination.address', addressInfo.address)
          setValue('destination.fromJar', jarIndex)
          setShowAddressFromJarSelectorDialog(false)
        }}
      />
      <form onSubmit={handleSubmit(onSubmit)} className={cn('flex flex-col gap-4', className)}>
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-4">
            {jars.map((jar, index) => (
              <SelectableJar
                key={index}
                name={jar.name}
                color={jar.color}
                balance={jar.balanceSummary.calculatedTotalBalanceInSats}
                totalBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
                isSelected={sourceJarIndex === index}
                onClick={() => setValue('sourceJarIndex', index)}
                disabled={jar.balanceSummary.calculatedAvailableBalanceInSats <= 0}
              />
            ))}
          </div>

          {errors.sourceJarIndex && (
            <div className="light:text-red-700 text-xs text-red-500">{t('send.feedback_invalid_source_jar')}</div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="send-destination" className="text-sm font-medium">
            {t('send.label_recipient')}
          </Label>

          <div className="relative">
            <Input
              id="send-destination"
              {...register('destination.address', {
                required: true,
                disabled,
              })}
              type="text"
              className={cn('pr-30', {
                hidden: destinationJar !== undefined,
              })}
              placeholder={t('send.placeholder_recipient')}
            />
            <Input
              id="send-destination-address-from-jar"
              type="text"
              readOnly
              className={cn('pr-30', {
                hidden: destinationJar === undefined,
              })}
              value={`${destinationJar?.name} (${destinationAddress})`}
            />
            <div className="absolute top-1/2 right-0 -translate-y-1/2">
              <div className="flex items-center gap-2">
                {destinationAddressInfo?.network && destinationAddressInfo.network !== 'mainnet' && (
                  <Badge variant="outline">{destinationAddressInfo.network}</Badge>
                )}
                {destinationJar === undefined ? (
                  <Button
                    id="show-address-from-jar-selector-trigger"
                    size="icon"
                    onClick={() => setShowAddressFromJarSelectorDialog(true)}
                  >
                    <MilkIcon />
                  </Button>
                ) : (
                  <Button
                    id="clear-address-from-jar-selector-trigger"
                    size="icon"
                    onClick={() => {
                      setValue('destination.address', undefined)
                      setValue('destination.fromJar', undefined)
                    }}
                  >
                    <XIcon />
                  </Button>
                )}
              </div>
            </div>
          </div>
          {errors.destination && (
            <>
              <div className="light:text-red-700 text-xs text-red-500">
                {t('send.feedback_invalid_destination_address')}
              </div>
              {/* TODO: feedback_invalid_source_jar */}
              {/* TODO: feedback_reused_address */}
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="send-amount" className="text-sm font-medium">
            {t('send.label_amount_input')}
          </Label>
          <div className="relative">
            <div className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center px-3">
              {FieldPrefixSatSymbol}
            </div>

            <Input
              id="send-amount"
              {...register('amount.amount', {
                required: true,
                disabled,
              })}
              type="number"
              className="pl-9"
              placeholder={t('send.placeholder_amount_input')}
            />
          </div>
          {errors.amount && (
            <div className="light:text-red-700 text-xs text-red-500">{t('send.feedback_invalid_amount')}</div>
          )}
        </div>

        <Button
          type="submit"
          variant={disabled ? 'outline' : undefined}
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
            <>{t('send.button_send')}</>
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
            </CardContent>
          </Card>
        )}
      </form>
    </>
  )
}
