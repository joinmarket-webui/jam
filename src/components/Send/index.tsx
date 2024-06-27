import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FormikProps } from 'formik'
import { useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import * as Api from '../../libs/JmWalletApi'
import PageTitle from '../PageTitle'
import Sprite from '../Sprite'
import { SendForm, SendFormValues } from './SendForm'
import { ConfirmModal } from '../Modal'
import { scrollToTop } from '../../utils'
import { PaymentConfirmModal } from '../PaymentConfirmModal'
import FeeConfigModal, { FeeConfigSectionKey } from '../settings/FeeConfigModal'
import { FeeValues, TxFee, useFeeConfigValues } from '../../hooks/Fees'
import { useReloadCurrentWalletInfo, useCurrentWalletInfo, CurrentWallet } from '../../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../../context/ServiceInfoContext'
import { useLoadConfigValue } from '../../context/ServiceConfigContext'
import { useWaitForUtxosToBeSpent } from '../../hooks/WaitForUtxosToBeSpent'
import { routes } from '../../constants/routes'
import { JM_MINIMUM_MAKERS_DEFAULT } from '../../constants/config'
import { useSettings } from '../../context/SettingsContext'
import { UtxoListDisplay, Divider } from './ShowUtxos'

import { initialNumCollaborators } from './helpers'

const INITIAL_DESTINATION = null
const INITIAL_SOURCE_JAR_INDEX = null
const INITIAL_AMOUNT = null
const INITIAL_IS_COINJOIN = true

type MaxFeeConfigMissingAlertProps = {
  onSuccess: () => void
}

function MaxFeeConfigMissingAlert({ onSuccess }: MaxFeeConfigMissingAlertProps) {
  const { t } = useTranslation()

  const [activeFeeConfigModalSection, setActiveFeeConfigModalSection] = useState<FeeConfigSectionKey>()
  const [showFeeConfigModal, setShowFeeConfigModal] = useState(false)

  return (
    <>
      {showFeeConfigModal && (
        <FeeConfigModal
          show={showFeeConfigModal}
          onSuccess={onSuccess}
          onHide={() => setShowFeeConfigModal(false)}
          defaultActiveSectionKey={activeFeeConfigModalSection}
        />
      )}
      <rb.Alert className="slashed-zeroes" variant="danger">
        {t('send.taker_error_message_max_fees_config_missing')}
        &nbsp;
        <rb.Alert.Link
          onClick={() => {
            setActiveFeeConfigModalSection('cj_fee')
            setShowFeeConfigModal(true)
          }}
        >
          {t('settings.show_fee_config')}
        </rb.Alert.Link>
      </rb.Alert>
    </>
  )
}

const createInitialValues = (numCollaborators: number, feeConfigValues: FeeValues | undefined): SendFormValues => {
  return {
    sourceJarIndex: INITIAL_SOURCE_JAR_INDEX ?? undefined,
    destination: {
      value: INITIAL_DESTINATION,
      fromJar: null,
    },
    amount: {
      value: INITIAL_AMOUNT,
      isSweep: false,
    },
    txFee: feeConfigValues?.tx_fees,
    isCoinJoin: INITIAL_IS_COINJOIN,
    numCollaborators,
  }
}

type SendProps = {
  wallet: CurrentWallet
}
export default function Send({ wallet }: SendProps) {
  const { t } = useTranslation()
  const walletInfo = useCurrentWalletInfo()

  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const loadConfigValue = useLoadConfigValue()
  const settings = useSettings()

  const isCoinjoinInProgress = useMemo(() => serviceInfo?.coinjoinInProgress === true, [serviceInfo])
  const isMakerRunning = useMemo(() => serviceInfo?.makerRunning === true, [serviceInfo])
  const isRescanningInProgress = useMemo(() => serviceInfo?.rescanning === true, [serviceInfo])

  const [alert, setAlert] = useState<SimpleAlert>()
  const [isSending, setIsSending] = useState(false)
  const [minNumCollaborators, setMinNumCollaborators] = useState(JM_MINIMUM_MAKERS_DEFAULT)
  const initNumCollaborators = useMemo(() => initialNumCollaborators(minNumCollaborators), [minNumCollaborators])

  const [feeConfigValues, reloadFeeConfigValues] = useFeeConfigValues()
  const maxFeesConfigMissing = useMemo(
    () =>
      feeConfigValues && (feeConfigValues.max_cj_fee_abs === undefined || feeConfigValues.max_cj_fee_rel === undefined),
    [feeConfigValues],
  )

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<Api.UtxoId[]>([])
  const [paymentSuccessfulInfoAlert, setPaymentSuccessfulInfoAlert] = useState<SimpleAlert>()

  const isOperationDisabled = useMemo(
    () =>
      maxFeesConfigMissing ||
      isCoinjoinInProgress ||
      isMakerRunning ||
      isRescanningInProgress ||
      waitForUtxosToBeSpent.length > 0,
    [maxFeesConfigMissing, isCoinjoinInProgress, isMakerRunning, isRescanningInProgress, waitForUtxosToBeSpent],
  )
  const [isInitializing, setIsInitializing] = useState(!isOperationDisabled)
  const isLoading = useMemo(
    () => !walletInfo || isInitializing || waitForUtxosToBeSpent.length > 0,
    [walletInfo, isInitializing, waitForUtxosToBeSpent],
  )

  const sortedAccountBalances = useMemo(() => {
    if (!walletInfo) return []
    return Object.values(walletInfo.balanceSummary.accountBalances).sort(
      (lhs, rhs) => lhs.accountIndex - rhs.accountIndex,
    )
  }, [walletInfo])

  const [showConfirmAbortModal, setShowConfirmAbortModal] = useState(false)
  const [showConfirmSendModal, setShowConfirmSendModal] = useState<SendFormValues>()
  const [showSelectedUtxos, setShowSelectedUtxos] = useState<boolean>(false)

  const initialValues = useMemo(
    () => createInitialValues(initNumCollaborators, feeConfigValues),
    [initNumCollaborators, feeConfigValues],
  )
  const formRef = useRef<FormikProps<SendFormValues>>(null)

  const loadNewWalletAddress = useCallback(
    (props: { signal: AbortSignal; jarIndex: JarIndex }): Promise<Api.BitcoinAddress> => {
      return Api.getAddressNew({
        ...wallet,
        signal: props.signal,
        mixdepth: props.jarIndex,
      })
        .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('receive.error_loading_address_failed'))))
        .then((data) => {
          return data.address
        })
        .catch((err) => {
          if (!props.signal.aborted) {
            setAlert({ variant: 'danger', message: err.message })
          }
          throw err
        })
    },
    [wallet, setAlert, t],
  )

  const waitForUtxosToBeSpentContext = useMemo(
    () => ({
      waitForUtxosToBeSpent,
      setWaitForUtxosToBeSpent,
      onError: (error: any) => {
        const message = t('global.errors.error_reloading_wallet_failed', {
          reason: error.message || t('global.errors.reason_unknown'),
        })
        setAlert({ variant: 'danger', message })
      },
    }),
    [waitForUtxosToBeSpent, t],
  )

  useWaitForUtxosToBeSpent(waitForUtxosToBeSpentContext)

  useEffect(
    function initialize() {
      if (isOperationDisabled) {
        setIsInitializing(false)
        return
      }

      const abortCtrl = new AbortController()

      setAlert(undefined)
      setIsInitializing(true)

      // reloading service info is important, as it must be known as soon as possible
      // if the operation is even allowed, i.e. if no other service is running
      const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal }).catch((err) => {
        if (abortCtrl.signal.aborted) return
        // reusing "wallet failed" message here is okay, as session info also contains wallet information
        const message = t('global.errors.error_loading_wallet_failed', {
          reason: err.message || t('global.errors.reason_unknown'),
        })
        setAlert({ variant: 'danger', message })
      })

      const loadingWalletInfoAndUtxos = reloadCurrentWalletInfo
        .reloadUtxos({ signal: abortCtrl.signal })
        .catch((err) => {
          if (abortCtrl.signal.aborted) return
          const message = t('global.errors.error_loading_wallet_failed', {
            reason: err.message || t('global.errors.reason_unknown'),
          })
          setAlert({ variant: 'danger', message })
        })

      const loadingMinimumMakerConfig = loadConfigValue({
        signal: abortCtrl.signal,
        key: { section: 'POLICY', field: 'minimum_makers' },
      })
        .then((data) => (data.value !== null ? parseInt(data.value, 10) : JM_MINIMUM_MAKERS_DEFAULT))
        .then((minimumMakers) => {
          if (abortCtrl.signal.aborted) return

          setMinNumCollaborators(minimumMakers)
        })
        .catch((err) => {
          if (abortCtrl.signal.aborted) return
          setAlert({ variant: 'danger', message: err.message })
        })

      Promise.all([loadingServiceInfo, loadingWalletInfoAndUtxos, loadingMinimumMakerConfig]).finally(
        () => !abortCtrl.signal.aborted && setIsInitializing(false),
      )

      return () => abortCtrl.abort()
    },
    [isOperationDisabled, wallet, reloadCurrentWalletInfo, reloadServiceInfo, loadConfigValue, t],
  )

  const sendPayment = async (
    sourceJarIndex: JarIndex,
    destination: Api.BitcoinAddress,
    amountSats: Api.AmountSats,
    txFee: TxFee,
  ) => {
    setAlert(undefined)
    setPaymentSuccessfulInfoAlert(undefined)
    setIsSending(true)

    let success = false
    try {
      const res = await Api.postDirectSend(
        { ...wallet },
        { mixdepth: sourceJarIndex, amount_sats: amountSats, destination, txfee: txFee.value },
      )

      if (res.ok) {
        // TODO: add type for json response
        const {
          txinfo: { outputs, inputs, txid },
        } = await res.json()
        const output = outputs.find((o: any) => o.address === destination)
        setPaymentSuccessfulInfoAlert({
          variant: 'success',
          message: t('send.alert_payment_successful', {
            amount: output.value_sats,
            address: output.address,
            txid,
          }),
        })
        setWaitForUtxosToBeSpent(inputs.map((it: any) => it.outpoint))
        success = true
      } else {
        const errorMessage = await Api.Helper.extractErrorMessage(res)
        const message = `${errorMessage} ${
          res.status === 400 ? t('send.direct_payment_error_message_bad_request') : ''
        }`
        setAlert({ variant: 'danger', message })
      }

      setIsSending(false)
    } catch (e: any) {
      setIsSending(false)
      setAlert({ variant: 'danger', message: e.message })
    }

    return success
  }

  const startCoinjoin = async (
    sourceJarIndex: JarIndex,
    destination: Api.BitcoinAddress,
    amountSats: Api.AmountSats,
    counterparties: number,
    txFee: TxFee,
  ) => {
    setAlert(undefined)
    setIsSending(true)

    let success = false
    try {
      const res = await Api.postCoinjoin(
        { ...wallet },
        {
          mixdepth: sourceJarIndex,
          amount_sats: amountSats,
          destination,
          counterparties,
          txfee: txFee.value,
        },
      )

      if (res.ok) {
        const data = await res.json()
        console.log(data)
        success = true
      } else {
        const message = await Api.Helper.extractErrorMessage(res)
        setAlert({ variant: 'danger', message })
      }

      setIsSending(false)
    } catch (e: any) {
      setIsSending(false)
      setAlert({ variant: 'danger', message: e.message })
    }

    return success
  }

  useEffect(() => {
    // hide the abort modal, if a user wants to abort a running transaction,
    // but the transaction failed or succeeded in the meantime
    if (showConfirmAbortModal && !isCoinjoinInProgress) {
      setShowConfirmAbortModal(false)
    }
  }, [isCoinjoinInProgress, showConfirmAbortModal])

  const abortCoinjoin = async () => {
    if (!isCoinjoinInProgress) {
      setShowConfirmAbortModal(false)
      return
    }

    if (!showConfirmAbortModal) {
      setShowConfirmAbortModal(true)
      return
    }

    setShowConfirmAbortModal(false)
    setAlert(undefined)

    const abortCtrl = new AbortController()
    return Api.getTakerStop({ ...wallet, signal: abortCtrl.signal })
      .then((res) => (res.ok ? true : Api.Helper.throwError(res)))
      .catch((err) => {
        if (abortCtrl.signal.aborted) return
        setAlert({ variant: 'danger', message: err.message })
      })
  }

  const onSubmit = async (values: SendFormValues) => {
    if (isLoading || isOperationDisabled || isSending) return

    setPaymentSuccessfulInfoAlert(undefined)

    const isValid =
      values.amount !== undefined &&
      values.sourceJarIndex !== undefined &&
      values.destination !== undefined &&
      values.txFee !== undefined

    if (isValid) {
      if (values.amount!.isSweep === true && values.amount!.value !== 0) {
        console.error('Sanity check failed: Sweep amount mismatch. This should not happen.')
        return
      }
      if (
        values.destination!.value === null ||
        values.amount!.value === null ||
        (values.isCoinJoin === true && values.numCollaborators === undefined)
      ) {
        console.error('Sanity check failed: Form is invalid and is missing required values. This should not happen.')
        return
      }

      if (showConfirmSendModal === undefined) {
        if (walletInfo?.utxosByJar && values.sourceJarIndex !== undefined) {
          values.selectedUtxos = walletInfo.utxosByJar[values.sourceJarIndex].filter((utxo) => {
            return utxo.frozen === false
          })
          setShowConfirmSendModal(values)
          return
        }
      }

      setShowConfirmSendModal(undefined)

      const success = values.isCoinJoin
        ? await startCoinjoin(
            values.sourceJarIndex!,
            values.destination!.value!,
            values.amount!.value,
            values.numCollaborators!,
            values.txFee!,
          )
        : await sendPayment(values.sourceJarIndex!, values.destination!.value!, values.amount!.value, values.txFee!)

      if (success) {
        formRef.current?.resetForm({ values: initialValues })
      }

      scrollToTop()
    }
  }

  return (
    <div>
      <PageTitle title={t('send.title')} subtitle={t('send.subtitle')} />
      <rb.Fade in={isOperationDisabled} mountOnEnter={true} unmountOnExit={true}>
        <>
          {isMakerRunning && (
            <Link to={routes.earn} className="unstyled">
              <rb.Alert variant="info" className="mb-4">
                <rb.Row className="align-items-center">
                  <rb.Col>{t('send.text_maker_running')}</rb.Col>
                  <rb.Col xs="auto">
                    <Sprite symbol="caret-right" width="24" height="24" />
                  </rb.Col>
                </rb.Row>
              </rb.Alert>
            </Link>
          )}
          {isCoinjoinInProgress && (
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="d-flex align-items-center justify-content-center alert alert-success rounded-circle p-3">
                  <Sprite symbol="clock" width="32" height="32" />
                </div>
              </div>
              <rb.Alert variant="success" className="d-flex align-items-center">
                {t('send.text_coinjoin_already_running')}
                <Sprite className="ms-auto" symbol="joining" width="20" height="20" />
              </rb.Alert>
              <rb.Button
                variant="none"
                className="w-100 mb-4"
                disabled={showConfirmAbortModal}
                onClick={() => abortCoinjoin()}
              >
                <div className="d-flex justify-content-center align-items-center">
                  <Sprite symbol="cancel" width="24" height="24" className="me-1" />
                  {t('global.abort')}
                </div>
              </rb.Button>
            </div>
          )}
        </>
      </rb.Fade>

      {maxFeesConfigMissing && <MaxFeeConfigMissingAlert onSuccess={() => reloadFeeConfigValues()} />}

      {alert && (
        <rb.Alert className="slashed-zeroes" variant={alert.variant}>
          {alert.message}
        </rb.Alert>
      )}

      {paymentSuccessfulInfoAlert && (
        <>
          <div className="d-flex align-items-center justify-content-center mb-2">
            <div className="d-flex align-items-center justify-content-center alert alert-success rounded-circle p-3">
              <Sprite symbol="checkmark" width="24" height="24" />
            </div>
          </div>
          <rb.Alert className="small slashed-zeroes break-word" variant={paymentSuccessfulInfoAlert.variant}>
            {paymentSuccessfulInfoAlert.message}
          </rb.Alert>
        </>
      )}

      <SendForm
        formRef={formRef}
        initialValues={initialValues}
        onSubmit={onSubmit}
        blurred={isMakerRunning || isCoinjoinInProgress}
        disabled={isOperationDisabled}
        isLoading={isLoading}
        walletInfo={walletInfo}
        wallet={wallet}
        minNumCollaborators={minNumCollaborators}
        loadNewWalletAddress={loadNewWalletAddress}
        feeConfigValues={feeConfigValues}
        reloadFeeConfigValues={reloadFeeConfigValues}
      />

      {showConfirmAbortModal && (
        <ConfirmModal
          isShown={showConfirmAbortModal}
          title={t('send.confirm_abort_modal.title')}
          onCancel={() => setShowConfirmAbortModal(false)}
          onConfirm={() => abortCoinjoin()}
        >
          {t('send.confirm_abort_modal.text_body')}
        </ConfirmModal>
      )}

      {showConfirmSendModal && (
        <PaymentConfirmModal
          size="lg"
          isShown={true}
          title={t('send.confirm_send_modal.title')}
          onCancel={() => setShowConfirmSendModal(undefined)}
          onConfirm={() => {
            formRef.current?.submitForm()
          }}
          data={{
            sourceJarIndex: showConfirmSendModal.sourceJarIndex,
            destination: showConfirmSendModal.destination?.value!,
            amount: showConfirmSendModal.amount!.isSweep
              ? sortedAccountBalances[showConfirmSendModal.sourceJarIndex!].calculatedAvailableBalanceInSats
              : showConfirmSendModal.amount!.value!,
            isSweep: showConfirmSendModal.amount!.isSweep,
            isCoinjoin: showConfirmSendModal.isCoinJoin,
            numCollaborators: showConfirmSendModal.numCollaborators!,
            feeConfigValues: { ...feeConfigValues, tx_fees: showConfirmSendModal.txFee },
          }}
        />
      )}
    </div>
  )
}
