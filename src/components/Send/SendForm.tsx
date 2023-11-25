import { useState, useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import * as Api from '../../libs/JmWalletApi'
import ToggleSwitch from '../ToggleSwitch'
import Sprite from '../Sprite'
import { jarFillLevel, SelectableJar } from '../jars/Jar'
import { CoinjoinPreconditionViolationAlert } from '../CoinjoinPreconditionViolationAlert'
import CollaboratorsSelector from './CollaboratorsSelector'
import Accordion from '../Accordion'
import FeeConfigModal, { FeeConfigSectionKey } from '../settings/FeeConfigModal'
import { useFeeConfigValues, useEstimatedMaxCollaboratorFee } from '../../hooks/Fees'
import { WalletInfo } from '../../context/WalletContext'
import { buildCoinjoinRequirementSummary } from '../../hooks/CoinjoinRequirements'
import { formatSats } from '../../utils'
import {
  MAX_NUM_COLLABORATORS,
  isValidAddress,
  isValidAmount,
  isValidJarIndex,
  isValidNumCollaborators,
} from './helpers'
import styles from './Send.module.css'
import FeeBreakdown from './FeeBreakdown'
import { Formik, FormikErrors, FormikProps } from 'formik'
import { AccountBalanceSummary, AccountBalances } from '../../context/BalanceSummary'
import { DestinationInputField, DestinationValue } from './DestinationInputField'
import { AmountInputField, AmountValue } from './AmountInputField'
import { SweepBreakdown } from './SweepBreakdown'

type CollaborativeTransactionOptionsProps = {
  selectedAmount?: AmountValue
  selectedNumCollaborators?: number
  sourceJarBalance?: AccountBalanceSummary
  isLoading: boolean
  disabled?: boolean
  minNumCollaborators: number
  numCollaborators: number | null
  setNumCollaborators: (val: number | null) => void
}

function CollaborativeTransactionOptions({
  selectedAmount,
  selectedNumCollaborators,
  sourceJarBalance,
  isLoading,
  disabled,
  minNumCollaborators,
}: CollaborativeTransactionOptionsProps) {
  const { t } = useTranslation()

  const [feeConfigValues, reloadFeeConfigValues] = useFeeConfigValues()
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
            maxCollaboratorFee: estimatedMaxCollaboratorFee
              ? `≤${formatSats(estimatedMaxCollaboratorFee)} sats`
              : '...',
          })}
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

        {sourceJarBalance && (
          <FeeBreakdown
            feeConfigValues={feeConfigValues}
            numCollaborators={selectedNumCollaborators ?? null}
            amount={
              selectedAmount?.isSweep
                ? sourceJarBalance.calculatedAvailableBalanceInSats
                : selectedAmount?.value ?? null
            }
            onClick={() => {
              setActiveFeeConfigModalSection('cj_fee')
              setShowFeeConfigModal(true)
            }}
          />
        )}

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

export interface SendFormValues {
  sourceJarIndex?: JarIndex
  destination?: DestinationValue
  amount?: AmountValue
  numCollaborators?: number
  isCoinJoin: boolean
}

interface InnerSendFormProps {
  props: FormikProps<SendFormValues>
  isLoading: boolean
  disabled?: boolean
  walletInfo?: WalletInfo
  loadNewWalletAddress: (props: { signal: AbortSignal; jarIndex: JarIndex }) => Promise<Api.BitcoinAddress>
  jarBalances: AccountBalanceSummary[]
  minNumCollaborators: number
}

const InnerSendForm = ({
  props,
  loadNewWalletAddress,
  isLoading,
  walletInfo,
  disabled,
  jarBalances,
  minNumCollaborators,
}: InnerSendFormProps) => {
  const { t } = useTranslation()

  const sourceJarUtxos = useMemo(() => {
    if (!walletInfo || props.values.sourceJarIndex === undefined) return null
    return walletInfo.data.utxos.utxos.filter((it) => it.mixdepth === props.values.sourceJarIndex)
  }, [walletInfo, props.values.sourceJarIndex])

  const sourceJarCoinjoinPreconditionSummary = useMemo(() => {
    if (sourceJarUtxos === null) return null
    console.log(1)
    return buildCoinjoinRequirementSummary(sourceJarUtxos)
  }, [sourceJarUtxos])

  const sourceJarBalance =
    props.values.sourceJarIndex !== undefined ? jarBalances[props.values.sourceJarIndex] : undefined

  const submitButtonOptions = (() => {
    if (!isLoading) {
      if (!props.values.isCoinJoin) {
        return {
          variant: 'danger',
          text: t('send.button_send_without_improved_privacy'),
        }
      } else if (sourceJarCoinjoinPreconditionSummary?.isFulfilled === false) {
        return {
          variant: 'warning',
          text: t('send.button_send_despite_warning'),
        }
      }
    }

    return {
      variant: 'dark',
      text: t('send.button_send'),
    }
  })()

  return (
    <>
      <rb.Form onSubmit={props.handleSubmit} noValidate>
        <rb.Form.Group className="mb-4 flex-grow-1" controlId="sourceJarIndex">
          <rb.Form.Label>{t('send.label_source_jar')}</rb.Form.Label>
          {!walletInfo || jarBalances.length === 0 ? (
            <rb.Placeholder as="div" animation="wave">
              <rb.Placeholder className={styles.sourceJarsPlaceholder} />
            </rb.Placeholder>
          ) : (
            <div className={styles.sourceJarsContainer}>
              {jarBalances.map((it) => (
                <SelectableJar
                  key={it.accountIndex}
                  index={it.accountIndex}
                  balance={it.calculatedAvailableBalanceInSats}
                  frozenBalance={it.calculatedFrozenOrLockedBalanceInSats}
                  isSelectable={!disabled && !isLoading && it.calculatedAvailableBalanceInSats > 0}
                  isSelected={it.accountIndex === props.values.sourceJarIndex}
                  fillLevel={jarFillLevel(
                    it.calculatedTotalBalanceInSats,
                    walletInfo.balanceSummary.calculatedTotalBalanceInSats,
                  )}
                  variant={
                    it.accountIndex === props.values.sourceJarIndex &&
                    props.values.isCoinJoin &&
                    sourceJarCoinjoinPreconditionSummary?.isFulfilled === false
                      ? 'warning'
                      : undefined
                  }
                  onClick={(jarIndex) => props.setFieldValue('sourceJarIndex', jarIndex, true)}
                />
              ))}
            </div>
          )}
        </rb.Form.Group>
        {!isLoading &&
          !disabled &&
          props.values.isCoinJoin &&
          sourceJarCoinjoinPreconditionSummary?.isFulfilled === false && (
            <div className="mb-4">
              <CoinjoinPreconditionViolationAlert
                summary={sourceJarCoinjoinPreconditionSummary}
                i18nPrefix="send.coinjoin_precondition."
              />
            </div>
          )}
        <DestinationInputField
          className={styles.input}
          name="destination"
          walletInfo={walletInfo}
          label={t('send.label_recipient')}
          sourceJarIndex={props.values.sourceJarIndex}
          loadNewWalletAddress={loadNewWalletAddress}
          isLoading={isLoading}
          disabled={disabled}
        />

        <AmountInputField
          className={styles.input}
          name="amount"
          label={t('send.label_amount')}
          isLoading={isLoading}
          disabled={disabled}
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
            />
          </div>
        </Accordion>

        <rb.Button
          className="w-100 mb-4"
          variant={submitButtonOptions.variant}
          size="lg"
          type="submit"
          disabled={disabled || props.isSubmitting}
        >
          <div className="d-flex justify-content-center align-items-center">
            {props.isSubmitting ? (
              <>
                <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                {t('send.text_sending')}
              </>
            ) : (
              <>{submitButtonOptions.text}</>
            )}
          </div>
        </rb.Button>
      </rb.Form>
    </>
  )
}

interface SendFormProps {
  initialValues: SendFormValues
  onSubmit: (values: SendFormValues) => Promise<void>
  isLoading: boolean
  disabled?: boolean
  walletInfo?: WalletInfo
  loadNewWalletAddress: (props: { signal: AbortSignal; jarIndex: JarIndex }) => Promise<Api.BitcoinAddress>
  minNumCollaborators: number
  formRef?: React.Ref<FormikProps<SendFormValues>>
}

export const SendForm = ({
  initialValues,
  onSubmit,
  isLoading,
  disabled = false,
  loadNewWalletAddress,
  walletInfo,
  minNumCollaborators,
  formRef,
}: SendFormProps) => {
  const { t } = useTranslation()

  const sortedJarBalances = useMemo(() => {
    if (!walletInfo) return []
    return Object.values(walletInfo.balanceSummary.accountBalances).sort(
      (lhs, rhs) => lhs.accountIndex - rhs.accountIndex,
    )
  }, [walletInfo])

  const validate = (values: SendFormValues) => {
    const errors = {} as FormikErrors<SendFormValues>
    /** source jar */
    if (!isValidJarIndex(values.sourceJarIndex ?? -1)) {
      errors.sourceJarIndex = t('send.feedback_invalid_destination_address')
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
            jarBalances={sortedJarBalances}
            minNumCollaborators={minNumCollaborators}
            loadNewWalletAddress={loadNewWalletAddress}
            isLoading={isLoading}
            walletInfo={walletInfo}
            disabled={disabled}
          />
        )
      }}
    </Formik>
  )
}
