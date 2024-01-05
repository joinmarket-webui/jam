import { useState, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Formik, FormikErrors, FormikProps } from 'formik'
import * as rb from 'react-bootstrap'
import * as Api from '../../libs/JmWalletApi'
import ToggleSwitch from '../ToggleSwitch'
import Sprite from '../Sprite'
import { SourceJarSelector } from './SourceJarSelector'
import { CoinjoinPreconditionViolationAlert } from '../CoinjoinPreconditionViolationAlert'
import { DestinationInputField, DestinationValue } from './DestinationInputField'
import { AmountInputField } from './AmountInputField'
import { AmountValue } from '../UniversalBitcoinAmountInput'
import CollaboratorsSelector from './CollaboratorsSelector'
import { SweepBreakdown } from './SweepBreakdown'
import FeeBreakdown from './FeeBreakdown'
import Accordion from '../Accordion'
import Balance from '../Balance'
import FeeConfigModal, { FeeConfigSectionKey } from '../settings/FeeConfigModal'
import { useEstimatedMaxCollaboratorFee, FeeValues } from '../../hooks/Fees'
import { buildCoinjoinRequirementSummary } from '../../hooks/CoinjoinRequirements'
import {
  MAX_NUM_COLLABORATORS,
  isValidAddress,
  isValidAmount,
  isValidJarIndex,
  isValidNumCollaborators,
} from './helpers'
import { AccountBalanceSummary } from '../../context/BalanceSummary'
import { WalletInfo } from '../../context/WalletContext'
import { useSettings } from '../../context/SettingsContext'
import styles from './SendForm.module.css'

type CollaborativeTransactionOptionsProps = {
  selectedAmount?: AmountValue
  selectedNumCollaborators?: number
  sourceJarBalance?: AccountBalanceSummary
  isLoading: boolean
  disabled?: boolean
  minNumCollaborators: number
  numCollaborators: number | null
  setNumCollaborators: (val: number | null) => void
  feeConfigValues?: FeeValues
  reloadFeeConfigValues: () => void
}

function CollaborativeTransactionOptions({
  selectedAmount,
  selectedNumCollaborators,
  sourceJarBalance,
  isLoading,
  disabled,
  minNumCollaborators,
  feeConfigValues,
  reloadFeeConfigValues,
}: CollaborativeTransactionOptionsProps) {
  const settings = useSettings()
  const { t } = useTranslation()

  const [activeFeeConfigModalSection, setActiveFeeConfigModalSection] = useState<FeeConfigSectionKey>()
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false)

  const estimatedMaxCollaboratorFee = useEstimatedMaxCollaboratorFee({
    feeConfigValues,
    amount:
      selectedAmount?.isSweep && sourceJarBalance
        ? sourceJarBalance.calculatedAvailableBalanceInSats
        : selectedAmount?.value ?? null,
    numCollaborators: selectedNumCollaborators ?? null,
    isCoinjoin: true,
  })

  return (
    <>
      <CollaboratorsSelector
        name="numCollaborators"
        minNumCollaborators={minNumCollaborators}
        maxNumCollaborators={MAX_NUM_COLLABORATORS}
        disabled={isLoading || disabled}
      />

      <rb.Form.Group className="mt-4">
        <rb.Form.Label className="mb-0">
          {t('send.fee_breakdown.title', {
            maxCollaboratorFee: estimatedMaxCollaboratorFee !== null ? '≤' : '...',
          })}
          {estimatedMaxCollaboratorFee !== null && (
            <Balance
              valueString={String(estimatedMaxCollaboratorFee)}
              convertToUnit={settings.unit}
              showBalance={true}
            />
          )}
        </rb.Form.Label>
        <rb.Form.Text className="d-block text-secondary mb-2">
          <Trans
            i18nKey="send.fee_breakdown.subtitle"
            components={{
              1: (
                <span
                  onClick={() => {
                    setActiveFeeConfigModalSection('cj_fee')
                    setShowFeeConfigModal(true)
                  }}
                  className="text-decoration-underline link-secondary"
                />
              ),
            }}
          />
        </rb.Form.Text>
        <rb.Form.Text className="d-flex align-items-center mb-4">
          <Sprite className="rounded-circle border border-1 me-2" symbol="info" width="18" height="18" />
          <Trans
            i18nKey="send.fee_breakdown.alert_collaborator_fee_note"
            parent="div"
            components={{
              1: (
                <span
                  onClick={() => {
                    setActiveFeeConfigModalSection('tx_fee')
                    setShowFeeConfigModal(true)
                  }}
                  className="text-decoration-underline link-secondary"
                />
              ),
            }}
          />
        </rb.Form.Text>

        <FeeBreakdown
          feeConfigValues={feeConfigValues}
          numCollaborators={selectedNumCollaborators ?? null}
          amount={
            selectedAmount?.isSweep
              ? sourceJarBalance?.calculatedAvailableBalanceInSats ?? null
              : selectedAmount?.value ?? null
          }
          onClick={() => {
            setActiveFeeConfigModalSection('cj_fee')
            setShowFeeConfigModal(true)
          }}
        />

        {showFeeConfigModal && (
          <FeeConfigModal
            show={showFeeConfigModal}
            onSuccess={() => reloadFeeConfigValues()}
            onHide={() => setShowFeeConfigModal(false)}
            defaultActiveSectionKey={activeFeeConfigModalSection}
          />
        )}
      </rb.Form.Group>
    </>
  )
}

type SubmitButtonProps = {
  isLoading: boolean
  isSubmitting: boolean
  isCoinJoin: boolean
  isPreconditionFulfilled: boolean
  disabled?: boolean
}

function SubmitButton({ isLoading, isSubmitting, isCoinJoin, isPreconditionFulfilled, disabled }: SubmitButtonProps) {
  const { t } = useTranslation()

  const submitButtonOptions = useMemo(() => {
    if (isSubmitting) {
      return {
        variant: 'dark',
        element: (
          <>
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            {t('send.text_sending')}
          </>
        ),
      }
    }

    if (!isLoading) {
      if (!isCoinJoin) {
        return {
          variant: 'danger',
          element: <>{t('send.button_send_without_improved_privacy')}</>,
        }
      } else if (!isPreconditionFulfilled) {
        return {
          variant: 'warning',
          element: <>{t('send.button_send_despite_warning')}</>,
        }
      }
    }

    return {
      variant: 'dark',
      element: <>{t('send.button_send')}</>,
    }
  }, [isLoading, isSubmitting, isCoinJoin, isPreconditionFulfilled, t])

  return (
    <rb.Button className="w-100 mb-4" variant={submitButtonOptions.variant} size="lg" type="submit" disabled={disabled}>
      <div className="d-flex justify-content-center align-items-center">{submitButtonOptions.element}</div>
    </rb.Button>
  )
}

export interface SendFormValues {
  sourceJarIndex?: JarIndex
  destination?: DestinationValue
  amount?: AmountValue
  numCollaborators?: number
  isCoinJoin: boolean
}

interface InnerSendFormProps {
  props: FormikProps<SendFormValues>
  className?: string
  isLoading: boolean
  walletInfo?: WalletInfo
  loadNewWalletAddress: (props: { signal: AbortSignal; jarIndex: JarIndex }) => Promise<Api.BitcoinAddress>
  minNumCollaborators: number
  feeConfigValues?: FeeValues
  reloadFeeConfigValues: () => void
  disabled?: boolean
}

const InnerSendForm = ({
  props,
  className,
  isLoading,
  walletInfo,
  loadNewWalletAddress,
  minNumCollaborators,
  feeConfigValues,
  reloadFeeConfigValues,
  disabled = false,
}: InnerSendFormProps) => {
  const { t } = useTranslation()

  const jarBalances = useMemo(() => {
    if (!walletInfo) return []
    return Object.values(walletInfo.balanceSummary.accountBalances).sort(
      (lhs, rhs) => lhs.accountIndex - rhs.accountIndex,
    )
  }, [walletInfo])

  const sourceJarUtxos = useMemo(() => {
    if (!walletInfo || props.values.sourceJarIndex === undefined) return null
    return walletInfo.data.utxos.utxos.filter((it) => it.mixdepth === props.values.sourceJarIndex)
  }, [walletInfo, props.values.sourceJarIndex])

  const sourceJarCoinjoinPreconditionSummary = useMemo(() => {
    if (sourceJarUtxos === null) return null
    return buildCoinjoinRequirementSummary(sourceJarUtxos)
  }, [sourceJarUtxos])

  const sourceJarBalance =
    props.values.sourceJarIndex !== undefined ? jarBalances[props.values.sourceJarIndex] : undefined

  const showCoinjoinPreconditionViolationAlert =
    !isLoading && !disabled && props.values.isCoinJoin && sourceJarCoinjoinPreconditionSummary?.isFulfilled === false

  return (
    <>
      <rb.Form onSubmit={props.handleSubmit} noValidate className={className}>
        <SourceJarSelector
          name="sourceJarIndex"
          label={t('send.label_source_jar')}
          walletInfo={walletInfo}
          isLoading={isLoading}
          disabled={disabled}
          variant={showCoinjoinPreconditionViolationAlert ? 'warning' : 'default'}
        />
        {showCoinjoinPreconditionViolationAlert && (
          <div className="mb-4">
            <CoinjoinPreconditionViolationAlert
              summary={sourceJarCoinjoinPreconditionSummary}
              i18nPrefix="send.coinjoin_precondition."
            />
          </div>
        )}

        <DestinationInputField
          name="destination"
          label={t('send.label_recipient')}
          walletInfo={walletInfo}
          sourceJarIndex={props.values.sourceJarIndex}
          isLoading={isLoading}
          disabled={disabled}
          loadNewWalletAddress={loadNewWalletAddress}
        />

        <AmountInputField
          name="amount"
          label={t('send.label_amount_input')}
          placeholder={t('send.placeholder_amount_input')}
          isLoading={isLoading}
          disabled={disabled}
          enableSweep={true}
          sourceJarBalance={sourceJarBalance}
        />

        {props.values.amount?.isSweep && sourceJarBalance && (
          <div style={{ marginTop: '-1rem' }}>
            <SweepBreakdown jarBalance={sourceJarBalance} />
          </div>
        )}

        <Accordion title={t('send.sending_options')} disabled={disabled}>
          <rb.Form.Group controlId="isCoinjoin" className="mb-3">
            <ToggleSwitch
              label={t('send.toggle_coinjoin')}
              subtitle={t('send.toggle_coinjoin_subtitle')}
              toggledOn={props.values.isCoinJoin}
              onToggle={(isToggled) => props.setFieldValue('isCoinJoin', isToggled, true)}
              disabled={disabled || isLoading}
            />
          </rb.Form.Group>
          <div className={!props.values.isCoinJoin ? 'mb-4 d-block' : 'd-none'}>
            {/* direct-send options: empty on purpose */}
          </div>
          <div className={props.values.isCoinJoin ? 'mb-4 d-block' : 'd-none'}>
            <CollaborativeTransactionOptions
              selectedAmount={props.values.amount}
              selectedNumCollaborators={props.values.numCollaborators}
              isLoading={isLoading}
              sourceJarBalance={sourceJarBalance}
              disabled={disabled}
              minNumCollaborators={minNumCollaborators}
              numCollaborators={props.values.numCollaborators ?? null}
              setNumCollaborators={(val) => props.setFieldValue('numCollaborators', val, true)}
              feeConfigValues={feeConfigValues}
              reloadFeeConfigValues={reloadFeeConfigValues}
            />
          </div>
        </Accordion>

        <SubmitButton
          isLoading={isLoading}
          isSubmitting={props.isSubmitting}
          isCoinJoin={props.values.isCoinJoin}
          isPreconditionFulfilled={sourceJarCoinjoinPreconditionSummary?.isFulfilled !== false}
          disabled={disabled || props.isSubmitting || isLoading}
        />
      </rb.Form>
    </>
  )
}

type SendFormProps = Omit<InnerSendFormProps, 'props' | 'className'> & {
  initialValues: SendFormValues
  onSubmit: (values: SendFormValues) => Promise<void>
  formRef?: React.Ref<FormikProps<SendFormValues>>
  blurred?: boolean
}

export const SendForm = ({
  initialValues,
  onSubmit,
  formRef,
  blurred = false,
  walletInfo,
  minNumCollaborators,
  ...innerProps
}: SendFormProps) => {
  const { t } = useTranslation()

  const validate = (values: SendFormValues) => {
    const errors = {} as FormikErrors<SendFormValues>
    /** source jar */
    if (!isValidJarIndex(values.sourceJarIndex ?? -1)) {
      errors.sourceJarIndex = t('send.feedback_invalid_source_jar')
    }
    /** source jar - end */

    /** destination address */
    if (!isValidAddress(values.destination?.value || null)) {
      errors.destination = t('send.feedback_invalid_destination_address')
    }
    if (!!values.destination?.value && walletInfo?.addressSummary[values.destination.value]) {
      if (walletInfo.addressSummary[values.destination.value].status !== 'new') {
        errors.destination = t('send.feedback_reused_address')
      }
    }
    /** destination address - end */

    /** amount */
    if (!isValidAmount(values.amount?.value ?? null, values.amount?.isSweep || false)) {
      errors.amount = t('send.feedback_invalid_amount')
    }
    /** amount - end */

    /** collaborators */
    if (values.isCoinJoin && !isValidNumCollaborators(values.numCollaborators ?? null, minNumCollaborators)) {
      errors.numCollaborators = t('send.error_invalid_num_collaborators', {
        minNumCollaborators,
        maxNumCollaborators: MAX_NUM_COLLABORATORS,
      })
    }
    /** collaborators - end */

    return errors
  }

  return (
    <Formik innerRef={formRef} initialValues={initialValues} validate={validate} onSubmit={onSubmit}>
      {(props) => {
        return (
          <InnerSendForm
            props={props}
            className={blurred ? styles.blurred : undefined}
            walletInfo={walletInfo}
            minNumCollaborators={minNumCollaborators}
            {...innerProps}
          />
        )
      }}
    </Formik>
  )
}
