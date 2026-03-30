import { useCallback, useMemo, useState, type ComponentProps } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { freezeMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { getaddress, type ErrorMessage } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { useMutation } from '@tanstack/react-query'
import type { RowSelectionState } from '@tanstack/react-table'
import { getAddressInfo, validate as isValidBitcoinAddress, Network } from 'bitcoin-address-validation'
import type { AddressInfo } from 'bitcoin-address-validation'
import type { TFunction } from 'i18next'
import { BrushCleaningIcon, ListFilterIcon, MilkIcon, ScanQrCodeIcon, XIcon } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as yup from 'yup'
import QrScannerDialog from '@/components/ui/QrScannerDialog'
import { isDevMode } from '@/constants/debugFeatures'
import { JM_MINIMUM_MAKERS_DEFAULT } from '@/constants/jm'
import {
  useDetectNetwork,
  useJamWalletInfoContext,
  type AddressSummary,
  type Jar,
} from '@/context/JamWalletInfoContext'
import { useApiClient } from '@/hooks/useApiClient'
import type { Utxo } from '@/hooks/useQueryUtxos'
import type { FeeConfigValues } from '@/hooks/useFeeConfigValidation'
import type { BalanceSummary } from '@/lib/balanceSummary'
import { parseBip21Uri, type Bip21ParseResult } from '@/lib/bip21'
import { utxoTags } from '@/lib/tags'
import {
  cn,
  delayedPromise,
  factorToPercentage,
  isValidNumber,
  pseudoRandomInteger,
  type WalletFileName,
} from '@/lib/utils'
import type { JarIndex } from '@/types/global'
import { DevBadge } from '../dev/DevBadge'
import { buildSweepPreconditionSummary } from '../sweep/preconditions'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ButtonGroup } from '../ui/button-group'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Field, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { inputVariants } from '../ui/input-variants'
import { Address } from '../ui/jam/Address'
import { Balance } from '../ui/jam/Balance'
import { SatSymbol } from '../ui/jam/CurrencySymbol'
import { SelectableJar } from '../ui/jam/SelectableJar'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import { Switch } from '../ui/switch'
import { JarUtxosTable, type UtxoTableEntry } from '../wallet/JarUtxosTable'
import JarSelectorDialog from './JarSelectorDialog'
import { SendCoinjoinPreconditionAlert } from './SendCoinjoinPreconditionAlert'
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

const utxoToTableEntry = (utxo: Utxo, addressSummary: AddressSummary, t: TFunction): UtxoTableEntry => {
  return {
    utxo,
    tags: utxoTags(utxo, addressSummary, t),
  }
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
const SEND_AUTO_SELECTION_TOAST_ID = 'send.utxo.selection_changed_automatically'

// TODO: this value should be dynamic via jm backend settings
const MIN_NUM_COLLABORATORS = isDevMode() ? DEV_INITIAL_NUM_COLLABORATORS_INPUT : JM_MINIMUM_MAKERS_DEFAULT

const FORM_INPUT_DEFAULT_VALUES: Partial<SendFormValues> = {
  source: undefined,
  destination: undefined,
  amount: undefined,
  txFee: undefined,
  isCoinJoin: true,
  numCollaborators: MIN_NUM_COLLABORATORS,
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
            .min(
              minNumberOfCollaborators,
              t('send.error_invalid_num_collaborators', {
                minNumCollaborators: minNumberOfCollaborators,
                maxNumCollaborators: MAX_NUM_COLLABORATORS,
              }),
            )
            .max(
              MAX_NUM_COLLABORATORS,
              t('send.error_invalid_num_collaborators', {
                minNumCollaborators: minNumberOfCollaborators,
                maxNumCollaborators: MAX_NUM_COLLABORATORS,
              }),
            )
            .required(
              t('send.error_invalid_num_collaborators', {
                minNumCollaborators: minNumberOfCollaborators,
                maxNumCollaborators: MAX_NUM_COLLABORATORS,
              }),
            ),
        otherwise: (schema) =>
          schema
            .transform(() => null)
            .nullable()
            .optional(),
      }),
    })
    .required()
    .test('address-not-from-source-jar-test', function (root) {
      // Note: `fromJar` might still be `undefined` at this point
      if (root.source.fromJar === undefined) return true
      const addressIsFromSourceJar = addressSummary[root.destination.address]?.jarIndex === root.source.fromJar
      if (!addressIsFromSourceJar) return true

      const errorMessage = t('send.feedback_address_from_source_jar', {
        /* TODO: i18n: remove defaultValue and add key to language files */
        defaultValue: 'This address is from the source jar. To preserve your privacy please choose a different one.',
      })

      return new yup.ValidationError(errorMessage, root.destination.address, 'destination.address', undefined, true)
    })
    .test('amount-exceeds-balance-test', function (root) {
      if (root.amount.isSweep) return true
      if (root.amount.amount === undefined || root.amount.amount === null) return true

      const sourceJar = jars.find((it) => it.jarIndex === root.source.fromJar)
      if (!sourceJar) return true

      const available = sourceJar.balanceSummary.calculatedAvailableBalanceInSats
      if (root.amount.amount <= available) return true

      return new yup.ValidationError(
        t('send.feedback_amount_exceeds_balance'),
        root.amount.amount,
        'amount.amount',
        undefined,
        true,
      )
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
  feeConfigValues?: FeeConfigValues
  forceCoinJoinEnabled?: boolean
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
  feeConfigValues,
  forceCoinJoinEnabled = false,
  walletFileName,
  minNumberOfCollaborators = MIN_NUM_COLLABORATORS,
  jars,
  walletBalanceSummary,
  addressSummary,
  debug,
}: SendFormProps) {
  const { t } = useTranslation()
  const client = useApiClient()
  const { refetch: refetchWalletInfo } = useJamWalletInfoContext()

  const [showAddressFromJarSelectorDialog, setShowAddressFromJarSelectorDialog] = useState(false)
  const [showQrScannerDialog, setShowQrScannerDialog] = useState(false)
  const [showUtxoSelectorDialog, setShowUtxoSelectorDialog] = useState(false)
  const [utxoFilter, setUtxoFilter] = useState('')
  const [utxoRowSelection, setUtxoRowSelection] = useState<RowSelectionState>({})
  const [bip21Message, setBip21Message] = useState<string>()

  const { network } = useDetectNetwork()

  const schema = useMemo(
    () => sendFormSchema(jars, addressSummary, minNumberOfCollaborators, network, t),
    [jars, addressSummary, minNumberOfCollaborators, network, t],
  )
  const defaultValues = useMemo<Partial<SendFormValues>>(
    () => ({
      ...FORM_INPUT_DEFAULT_VALUES,
      numCollaborators: initialNumberOfCollaborators(minNumberOfCollaborators),
    }),
    [minNumberOfCollaborators],
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
    defaultValues,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<SendFormValues, unknown, SendFormValues>,
  })

  const values = useWatch({ control })
  const sourceJarIndex = useWatch({ control, name: 'source.fromJar' })
  const destinationAddress = useWatch({ control, name: 'destination.address' })
  const destinationJarIndex = useWatch({ control, name: 'destination.fromJar' })
  const isSweep = useWatch({ control, name: 'amount.isSweep' })
  const isCoinJoin = useWatch({ control, name: 'isCoinJoin' })
  const collaboratorCount = useWatch({ control, name: 'numCollaborators' })
  const isCoinJoinEnabled = forceCoinJoinEnabled || isCoinJoin === true

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

  const sourceJarTableEntries = useMemo(() => {
    return (sourceJar?.utxos || []).map((it) => utxoToTableEntry(it, addressSummary, t))
  }, [addressSummary, sourceJar?.utxos, t])

  const defaultUtxoRowSelection = useMemo<RowSelectionState>(() => {
    return (sourceJar?.utxos || []).reduce((acc, utxo) => {
      if (utxo.frozen === false && utxo.locktime === undefined) {
        acc[utxo.utxo] = true
      }
      return acc
    }, {} as RowSelectionState)
  }, [sourceJar?.utxos])

  const selectedSourceJarUtxos = useMemo(() => {
    return (sourceJar?.utxos || []).filter((utxo) => utxoRowSelection[utxo.utxo] === true)
  }, [sourceJar?.utxos, utxoRowSelection])

  const { mutateAsync: freezeOrUnfreezeUtxoMutateAsync } = useMutation({
    ...freezeMutation({ client }),
    retry: false,
  })

  const { mutateAsync: applyUtxoSelectionMutateAsync, isPending: isApplyingUtxoSelection } = useMutation({
    mutationFn: async ({ utxosToFreeze, utxosToUnfreeze }: { utxosToFreeze: Utxo[]; utxosToUnfreeze: Utxo[] }) => {
      const [freezeResult, unfreezeResult] = await Promise.all([
        Promise.allSettled(
          utxosToFreeze.map((utxo) =>
            freezeOrUnfreezeUtxoMutateAsync({
              path: {
                walletname: encodeURIComponent(walletFileName),
              },
              body: {
                'utxo-string': utxo.utxo,
                freeze: true,
              },
            }),
          ),
        ),
        Promise.allSettled(
          utxosToUnfreeze.map((utxo) =>
            freezeOrUnfreezeUtxoMutateAsync({
              path: {
                walletname: encodeURIComponent(walletFileName),
              },
              body: {
                'utxo-string': utxo.utxo,
                freeze: false,
              },
            }),
          ),
        ),
      ])

      return { freezeResult, unfreezeResult }
    },
  })

  const openUtxoSelectorDialog = useCallback(() => {
    if (!sourceJar) return
    toast.dismiss(SEND_AUTO_SELECTION_TOAST_ID)
    setUtxoFilter('')
    setUtxoRowSelection(defaultUtxoRowSelection)
    setShowUtxoSelectorDialog(true)
  }, [defaultUtxoRowSelection, sourceJar])

  const onApplyUtxoSelection = useCallback(async () => {
    if (!sourceJar) return

    // Keep same-address UTXOs together to avoid accidental privacy leaks.
    const selectedUtxoIds = new Set(selectedSourceJarUtxos.map((it) => it.utxo))
    const selectedAddresses = new Set(selectedSourceJarUtxos.map((it) => it.address))
    const mutableUtxos = sourceJar.utxos.filter((it) => it.locktime === undefined)
    const groupedSelectedUtxos = mutableUtxos.filter((it) => selectedAddresses.has(it.address))
    const groupedDeselectedUtxos = mutableUtxos.filter((it) => !selectedAddresses.has(it.address))
    const userDeselectedUtxos = mutableUtxos.filter((it) => !selectedUtxoIds.has(it.utxo))

    if (groupedSelectedUtxos.length > selectedSourceJarUtxos.length) {
      toast.warning(`Security measure: Selection changed`, {
        description: `Automatically selected ${groupedSelectedUtxos.length - selectedSourceJarUtxos.length} additional UTXOs with matching addresses.`,
        id: SEND_AUTO_SELECTION_TOAST_ID,
      })
    }

    if (groupedDeselectedUtxos.length > userDeselectedUtxos.length) {
      toast.warning(`Security measure: Selection changed`, {
        description: `Automatically deselected ${groupedDeselectedUtxos.length - userDeselectedUtxos.length} additional UTXOs with matching addresses.`,
        id: SEND_AUTO_SELECTION_TOAST_ID,
      })
    }

    // The selected set should remain spendable; everything else becomes frozen.
    const utxosToFreeze = mutableUtxos.filter((it) => !selectedAddresses.has(it.address) && it.frozen === false)
    const utxosToUnfreeze = mutableUtxos.filter((it) => selectedAddresses.has(it.address) && it.frozen === true)

    if (utxosToFreeze.length === 0 && utxosToUnfreeze.length === 0) {
      setShowUtxoSelectorDialog(false)
      return
    }

    try {
      const result = await applyUtxoSelectionMutateAsync({ utxosToFreeze, utxosToUnfreeze })
      await refetchWalletInfo()

      if (utxosToFreeze.length > 0) {
        const rejected = result.freezeResult.filter((it) => it.status === 'rejected')
        if (rejected.length === 0) {
          toast.success(t('jar_details.utxo_list.toast_freeze_success', { count: utxosToFreeze.length }))
        } else {
          toast.warning(t('jar_details.utxo_list.toast_freeze_error', { count: rejected.length }))
        }
      }

      if (utxosToUnfreeze.length > 0) {
        const rejected = result.unfreezeResult.filter((it) => it.status === 'rejected')
        if (rejected.length === 0) {
          toast.success(t('jar_details.utxo_list.toast_unfreeze_success', { count: utxosToUnfreeze.length }))
        } else {
          toast.warning(t('jar_details.utxo_list.toast_unfreeze_error', { count: rejected.length }))
        }
      }

      setShowUtxoSelectorDialog(false)
    } catch (_ignoredOnPurpose) {
      if (utxosToFreeze.length > 0) {
        toast.warning(t('jar_details.utxo_list.toast_freeze_error', { count: utxosToFreeze.length }))
      }
      if (utxosToUnfreeze.length > 0) {
        toast.warning(t('jar_details.utxo_list.toast_unfreeze_error', { count: utxosToUnfreeze.length }))
      }
    }
  }, [applyUtxoSelectionMutateAsync, refetchWalletInfo, selectedSourceJarUtxos, sourceJar, t])

  const destinationJar = useMemo(() => {
    if (destinationJarIndex === undefined) return
    return jars.find((it) => it.jarIndex === destinationJarIndex)
  }, [jars, destinationJarIndex])
  const coinjoinPreconditionSummary = useMemo(() => {
    if (!sourceJar) return undefined
    return buildSweepPreconditionSummary(sourceJar.utxos)
  }, [sourceJar])
  const hasCoinjoinPreconditionWarning = isCoinJoinEnabled && coinjoinPreconditionSummary?.isFulfilled === false
  const amountForFeeEstimate = useMemo(() => {
    if (values.amount?.isSweep === true) {
      return sourceJar?.balanceSummary.calculatedAvailableBalanceInSats
    }
    return values.amount?.amount
  }, [sourceJar, values.amount?.amount, values.amount?.isSweep])
  const estimatedMaxCollaboratorFee = useMemo(() => {
    if (
      !isCoinJoinEnabled ||
      values.numCollaborators === undefined ||
      amountForFeeEstimate === undefined ||
      feeConfigValues === undefined
    ) {
      return undefined
    }

    try {
      return estimateMaxCollaboratorFee(feeConfigValues, amountForFeeEstimate, values.numCollaborators)
    } catch (_ignoredOnPurpose) {
      return undefined
    }
  }, [amountForFeeEstimate, feeConfigValues, isCoinJoinEnabled, values.numCollaborators])

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
      <Dialog
        open={showUtxoSelectorDialog}
        onOpenChange={(open) => {
          if (isApplyingUtxoSelection) return
          setShowUtxoSelectorDialog(open)
        }}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{t('show_utxos.title')}</DialogTitle>
            <DialogDescription>
              {t('show_utxos.subtitle', { count: selectedSourceJarUtxos.length })} {t('show_utxos.text_subtitle_addon')}
            </DialogDescription>
          </DialogHeader>

          <Input
            value={utxoFilter}
            onChange={(event) => setUtxoFilter(event.target.value)}
            placeholder={t('jar_details.utxo_list.placeholder_search')}
          />
          <div className="max-h-[55vh] overflow-hidden">
            <JarUtxosTable
              globalFilter={utxoFilter}
              tableEntries={sourceJarTableEntries}
              pinnedEntries={[]}
              initialRowSelection={defaultUtxoRowSelection}
              onRowSelectionChange={setUtxoRowSelection}
              enableRowSelection={(row) => row.original.utxo.locktime === undefined}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUtxoSelectorDialog(false)}
              disabled={isApplyingUtxoSelection}
            >
              {t('modal.confirm_button_reject')}
            </Button>
            <Button
              type="button"
              onClick={() => void onApplyUtxoSelection()}
              disabled={isApplyingUtxoSelection}
            >
              {isApplyingUtxoSelection ? <Spinner /> : undefined}
              {t('modal.confirm_button_accept')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
        <div className="space-y-2">
          <Field className="space-y-4" data-invalid={errors.source !== undefined}>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>{t('send.label_source_jar')}</FieldLabel>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  disabled ||
                  sourceJar === undefined ||
                  sourceJar.utxos.length === 0 ||
                  isApplyingUtxoSelection
                }
                onClick={openUtxoSelectorDialog}
              >
                <ListFilterIcon />
                {t('show_utxos.text_select_utxos_tooltip')}
              </Button>
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
                  disabled={
                    disabled ||
                    isApplyingUtxoSelection ||
                    jar.balanceSummary.calculatedAvailableBalanceInSats <= 0
                  }
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
                    checked={isCoinJoinEnabled}
                    onCheckedChange={(checked) => {
                      if (forceCoinJoinEnabled) {
                        return
                      }
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

                {isCoinJoinEnabled && (
                  <div className="space-y-2">
                    <Field data-invalid={errors.numCollaborators !== undefined}>
                      <FieldLabel htmlFor="send-num-collaborators">
                        {t('send.label_num_collaborators', {
                          numCollaborators: isValidNumber(values.numCollaborators) ? values.numCollaborators : '-',
                        })}
                      </FieldLabel>
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
                    <p className="text-muted-foreground text-xs">{t('send.description_num_collaborators')}</p>
                    {estimatedMaxCollaboratorFee && (
                      <div className="text-muted-foreground text-xs">
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
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button
          type="submit"
          variant={
            disabled
              ? 'outline'
              : !isCoinJoinEnabled
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
              {!isCoinJoinEnabled ? (
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
