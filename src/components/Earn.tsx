import { useCallback, useEffect, useMemo, useState } from 'react'
import { Formik, FormikErrors } from 'formik'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { useSettings } from '../context/SettingsContext'
import { CurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo, WalletInfo } from '../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo, Offer } from '../context/ServiceInfoContext'
import { factorToPercentage, isAbsoluteOffer, isRelativeOffer, isValidNumber, percentageToFactor } from '../utils'
import { JM_DUST_THRESHOLD } from '../constants/jm'
import {
  OFFER_FEE_ABS_MIN,
  OFFER_FEE_REL_MAX,
  OFFER_FEE_REL_MIN,
  OFFER_FEE_REL_STEP,
  OFFER_MINSIZE_MIN,
} from '../constants/jam'
import * as Api from '../libs/JmWalletApi'
import * as fb from './fb/utils'
import Sprite from './Sprite'
import PageTitle from './PageTitle'
import SegmentedTabs from './SegmentedTabs'
import { CreateFidelityBond } from './fb/CreateFidelityBond'
import { ExistingFidelityBond } from './fb/ExistingFidelityBond'
import { RenewFidelityBondModal, SpendFidelityBondModal } from './fb/SpendFidelityBondModal'
import { EarnReportOverlay } from './EarnReport'
import { OrderbookOverlay } from './Orderbook'
import Balance from './Balance'
import Accordion from './Accordion'
import BitcoinAmountInput, { AmountValue, toAmountValue } from './BitcoinAmountInput'
import { isValidAmount } from './Send/helpers'
import styles from './Earn.module.css'

// In order to prevent state mismatch, the 'maker stop' response is delayed shortly.
// Even though the API response suggests that the maker has started or stopped immediately, it seems that this is not always the case.
// There is currently no way to know for sure - adding a delay at least mitigates the problem.
// 2022-04-26: With value of 2_000ms, no state corruption could be provoked in a local dev setup.
const MAKER_STOP_RESPONSE_DELAY_MS = 2_000

// When reloading UTXO after creating a fidelity bond, use a delay to make sure
// that the UTXO corresponding to the fidelity bond is correctly marked as such.
const RELOAD_FIDELITY_BONDS_DELAY_MS = 2_000

const OFFERTYPE_REL: Api.OfferType = 'sw0reloffer'
const OFFERTYPE_ABS: Api.OfferType = 'sw0absoffer'

const FORM_INPUT_LOCAL_STORAGE_KEYS = {
  offertype: 'jm-offertype',
  feeRel: 'jm-feeRel',
  feeAbs: 'jm-feeAbs',
  minsize: 'jm-minsize',
}

export interface EarnFormValues {
  offertype: Api.OfferType
  feeRel: number
  feeAbs?: AmountValue
  minsize?: AmountValue
}

const FORM_INPUT_DEFAULT_VALUES: Required<EarnFormValues> = {
  offertype: OFFERTYPE_REL,
  feeRel: 0.000_3,
  feeAbs: toAmountValue(250),
  minsize: toAmountValue(100_000),
}

const persistFormValues = (values: EarnFormValues) => {
  window.localStorage.setItem(FORM_INPUT_LOCAL_STORAGE_KEYS.offertype, values.offertype)

  if (values.minsize) {
    window.localStorage.setItem(FORM_INPUT_LOCAL_STORAGE_KEYS.minsize, String(values.minsize.value))
  }

  if (isRelativeOffer(values.offertype)) {
    window.localStorage.setItem(FORM_INPUT_LOCAL_STORAGE_KEYS.feeRel, String(values.feeRel))
  }
  if (isAbsoluteOffer(values.offertype) && values.feeAbs) {
    window.localStorage.setItem(FORM_INPUT_LOCAL_STORAGE_KEYS.feeAbs, String(values.feeAbs.value))
  }
}

const initialFormValues = (): EarnFormValues => {
  const feeRel = parseFloat(
    window.localStorage.getItem(FORM_INPUT_LOCAL_STORAGE_KEYS.feeRel) ?? String(FORM_INPUT_DEFAULT_VALUES.feeRel),
  )
  const feeAbs = parseInt(
    window.localStorage.getItem(FORM_INPUT_LOCAL_STORAGE_KEYS.feeAbs) ?? String(FORM_INPUT_DEFAULT_VALUES.feeAbs),
    10,
  )
  const minsize = parseInt(
    window.localStorage.getItem(FORM_INPUT_LOCAL_STORAGE_KEYS.minsize) ??
      String(FORM_INPUT_DEFAULT_VALUES.minsize.value),
    10,
  )
  const offertype =
    window.localStorage.getItem(FORM_INPUT_LOCAL_STORAGE_KEYS.offertype) ?? FORM_INPUT_DEFAULT_VALUES.offertype

  return {
    offertype,
    feeRel: isValidNumber(feeRel) ? feeRel : FORM_INPUT_DEFAULT_VALUES.feeRel,
    feeAbs: toAmountValue(isValidNumber(feeAbs) ? feeAbs : FORM_INPUT_DEFAULT_VALUES.feeAbs.value!),
    minsize: toAmountValue(isValidNumber(minsize) ? minsize : FORM_INPUT_DEFAULT_VALUES.minsize.value!),
  }
}

const renderOfferType = (offer: Offer, t: TFunction) => {
  if (isAbsoluteOffer(offer.ordertype)) {
    return <rb.Badge bg="info">{t('earn.current.text_offer_type_absolute')}</rb.Badge>
  }
  if (isRelativeOffer(offer.ordertype)) {
    return <rb.Badge bg="primary">{t('earn.current.text_offer_type_relative')}</rb.Badge>
  }
  return <rb.Badge bg="secondary">{offer.ordertype}</rb.Badge>
}

interface CurrentOfferProps {
  offer: Offer
  nickname: string
}

function CurrentOffer({ offer, nickname }: CurrentOfferProps) {
  const { t } = useTranslation()
  const settings = useSettings()

  return (
    <div className={styles.offerContainer}>
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex flex-column">
          <div className={styles.offerLabel}>{t('earn.current.text_offer')}</div>
          <div className={`${styles.offerTitle} slashed-zeroes`}>
            {nickname}:{offer.oid}
          </div>
        </div>
        <div className="d-flex align-items-center gap-1">{renderOfferType(offer, t)}</div>
      </div>
      <rb.Container className="mt-2">
        <rb.Row className="mb-1">
          <rb.Col xs={6}>
            <div className="d-flex flex-column">
              <div className={styles.offerLabel}>{t('earn.current.text_cjfee')}</div>
              <div>
                {isRelativeOffer(offer.ordertype) ? (
                  <>{factorToPercentage(parseFloat(offer.cjfee) || 0)}%</>
                ) : (
                  <>
                    <Balance
                      valueString={String(offer.cjfee)}
                      convertToUnit={settings.unit}
                      showBalance={settings.showBalance}
                    />
                  </>
                )}
              </div>
            </div>
          </rb.Col>

          <rb.Col xs={6}>
            <div className="d-flex flex-column">
              <div className={styles.offerLabel}>{t('earn.current.text_minsize')}</div>
              <div>
                <Balance
                  valueString={String(offer.minsize)}
                  convertToUnit={settings.unit}
                  showBalance={settings.showBalance}
                />
              </div>
            </div>
          </rb.Col>
        </rb.Row>

        <rb.Row>
          <rb.Col xs={6}>
            <div className="d-flex flex-column">
              <div className={styles.offerLabel}>{t('earn.current.text_txfee')}</div>
              <div>
                <Balance
                  valueString={String(offer.txfee)}
                  convertToUnit={settings.unit}
                  showBalance={settings.showBalance}
                />
              </div>
            </div>
          </rb.Col>

          <rb.Col xs={6}>
            <div className="d-flex flex-column">
              <div className={styles.offerLabel}>{t('earn.current.text_maxsize')}</div>
              <div>
                <Balance
                  valueString={String(offer.maxsize)}
                  convertToUnit={settings.unit}
                  showBalance={settings.showBalance}
                />
              </div>
            </div>
          </rb.Col>
        </rb.Row>
      </rb.Container>
    </div>
  )
}

interface EarnFormProps {
  initialValues?: EarnFormValues
  submitButtonText: (isSubmitting: boolean) => React.ReactNode | string
  onSubmit: (values: EarnFormValues) => Promise<void>
  isLoading: boolean
  disabled?: boolean
  walletInfo?: WalletInfo
}

const EarnForm = ({
  initialValues = FORM_INPUT_DEFAULT_VALUES,
  submitButtonText,
  onSubmit,
  isLoading,
  disabled = false,
  walletInfo,
}: EarnFormProps) => {
  const { t } = useTranslation()

  const maxAvailableBalanceInJar = useMemo(() => {
    return Math.max(
      0,
      Math.max(
        ...Object.values(walletInfo?.balanceSummary.accountBalances || []).map(
          (it) => it.calculatedAvailableBalanceInSats,
        ),
      ),
    )
  }, [walletInfo])

  const offerMinsizeMax = useMemo(() => {
    return Math.max(0, maxAvailableBalanceInJar - JM_DUST_THRESHOLD)
  }, [maxAvailableBalanceInJar])

  const validate = (values: EarnFormValues) => {
    const errors = {} as FormikErrors<EarnFormValues>
    const isRelOffer = isRelativeOffer(values.offertype)
    const isAbsOffer = isAbsoluteOffer(values.offertype)

    if (!isRelOffer && !isAbsOffer) {
      // currently no need for translation, this should never occur -> input is controlled by toggle
      errors.offertype = 'Offertype is not supported'
    }

    if (isRelOffer) {
      if (!isValidNumber(values.feeRel) || values.feeRel < OFFER_FEE_REL_MIN || values.feeRel > OFFER_FEE_REL_MAX) {
        errors.feeRel = t('earn.feedback_invalid_rel_fee', {
          feeRelPercentageMin: `${factorToPercentage(OFFER_FEE_REL_MIN)}%`,
          feeRelPercentageMax: `${factorToPercentage(OFFER_FEE_REL_MAX)}%`,
        })
      }
    }

    if (isAbsOffer) {
      if (!isValidNumber(values.feeAbs?.value) || values.feeAbs!.value! < OFFER_FEE_ABS_MIN) {
        errors.feeAbs = t('earn.feedback_invalid_abs_fee')
      }
    }

    if (!isValidAmount(values.minsize?.value ?? null, false)) {
      errors.minsize = t('earn.feedback_invalid_min_amount')
    } else {
      const minsize = values.minsize?.value || 0
      if (OFFER_MINSIZE_MIN > offerMinsizeMax) {
        errors.minsize = t('earn.feedback_invalid_min_amount_insufficient_funds')
      } else if (minsize < OFFER_MINSIZE_MIN || minsize > offerMinsizeMax) {
        errors.minsize = t('earn.feedback_invalid_min_amount_range', {
          minAmountMin: OFFER_MINSIZE_MIN.toLocaleString(),
          minAmountMax: offerMinsizeMax.toLocaleString(),
        })
      }
    }
    return errors
  }

  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      onSubmit={onSubmit}
      validateOnMount={true}
      initialTouched={{
        minsize: true,
      }}
    >
      {(props) => {
        const { handleSubmit, setFieldValue, handleBlur, values, touched, errors, isSubmitting } = props
        const minsizeField = props.getFieldProps<AmountValue>('minsize')
        const feeAbsField = props.getFieldProps<AmountValue>('feeAbs')
        return (
          <>
            <rb.Form onSubmit={handleSubmit} noValidate>
              <Accordion title={t('earn.button_settings')} variant={!props.isValid ? 'danger' : undefined}>
                <>
                  <rb.Form.Group className="mb-4 d-flex justify-content-center" controlId="offertype">
                    <SegmentedTabs
                      name="offertype"
                      tabs={[
                        {
                          label: t('earn.radio_abs_offer_label'),
                          value: OFFERTYPE_ABS,
                        },
                        {
                          label: t('earn.radio_rel_offer_label'),
                          value: OFFERTYPE_REL,
                        },
                      ]}
                      value={values.offertype}
                      onChange={(tab) => {
                        setFieldValue('offertype', tab.value, true)
                      }}
                      disabled={isLoading || isSubmitting}
                    />
                  </rb.Form.Group>
                  {values.offertype === OFFERTYPE_REL ? (
                    <rb.Form.Group className="mb-3" controlId="feeRel">
                      <rb.Form.Label className="mb-0">
                        {t('earn.label_rel_fee', {
                          fee: typeof values.feeRel === 'number' ? `(${factorToPercentage(values.feeRel)}%)` : '',
                        })}
                      </rb.Form.Label>
                      <rb.Form.Text className="d-block text-secondary mb-2">
                        {t('earn.description_rel_fee')}
                      </rb.Form.Text>
                      {isLoading ? (
                        <rb.Placeholder as="div" animation="wave">
                          <rb.Placeholder xs={12} className={styles['input-loader']} />
                        </rb.Placeholder>
                      ) : (
                        <rb.InputGroup hasValidation>
                          <rb.InputGroup.Text id="feeRel-addon1" className={styles.inputGroupText}>
                            %
                          </rb.InputGroup.Text>
                          <rb.Form.Control
                            aria-label={t('earn.label_rel_fee', { fee: '' })}
                            className="slashed-zeroes"
                            type="number"
                            name="feeRel"
                            disabled={isSubmitting}
                            onChange={(e) => {
                              const value = e.target.value || ''
                              setFieldValue('feeRel', value !== '' ? percentageToFactor(parseFloat(value)) : '', true)
                            }}
                            onBlur={handleBlur}
                            value={typeof values.feeRel === 'number' ? factorToPercentage(values.feeRel) : ''}
                            isValid={touched.feeRel && !errors.feeRel}
                            isInvalid={touched.feeRel && !!errors.feeRel}
                            min={factorToPercentage(OFFER_FEE_REL_MIN)}
                            step={factorToPercentage(OFFER_FEE_REL_STEP)}
                          />
                          <rb.Form.Control.Feedback type="invalid">{errors.feeRel}</rb.Form.Control.Feedback>
                        </rb.InputGroup>
                      )}
                    </rb.Form.Group>
                  ) : (
                    <rb.Form.Group className="mb-3" controlId="feeAbs">
                      <rb.Form.Label className="mb-0">
                        {t('earn.label_abs_fee', {
                          fee: '', // empty on purpose
                        })}
                      </rb.Form.Label>
                      <rb.Form.Text className="d-block text-secondary mb-2">
                        {t('earn.description_abs_fee')}
                      </rb.Form.Text>
                      {isLoading ? (
                        <rb.Placeholder as="div" animation="wave">
                          <rb.Placeholder xs={12} className={styles['input-loader']} />
                        </rb.Placeholder>
                      ) : (
                        <div className={touched.feeAbs && !!errors.feeAbs ? 'is-invalid' : ''}>
                          <BitcoinAmountInput
                            inputGroupTextClassName={styles.inputGroupText}
                            label={t('earn.label_abs_fee')}
                            placeholder={''}
                            field={feeAbsField}
                            form={props}
                            disabled={isSubmitting}
                          />
                        </div>
                      )}
                    </rb.Form.Group>
                  )}

                  <rb.Form.Group className="mb-4" controlId="minsize">
                    <rb.Form.Label>{t('earn.label_min_amount_input')}</rb.Form.Label>
                    {isLoading ? (
                      <rb.Placeholder as="div" animation="wave">
                        <rb.Placeholder xs={12} className={styles['input-loader']} />
                      </rb.Placeholder>
                    ) : (
                      <div className={touched.minsize && !!errors.minsize ? 'is-invalid' : ''}>
                        <BitcoinAmountInput
                          inputGroupTextClassName={styles.inputGroupText}
                          label={t('earn.label_min_amount_input')}
                          placeholder={t('earn.placeholder_min_amount_input')}
                          field={minsizeField}
                          form={props}
                          disabled={isSubmitting}
                        />
                      </div>
                    )}
                  </rb.Form.Group>
                </>
              </Accordion>
              <rb.Button
                className="w-100 mb-4"
                variant="dark"
                size="lg"
                type="submit"
                disabled={isLoading || isSubmitting || disabled}
              >
                <div className="d-flex justify-content-center align-items-center">{submitButtonText(isSubmitting)}</div>
              </rb.Button>
            </rb.Form>
          </>
        )
      }}
    </Formik>
  )
}

const toStartMakerRequest = (values: EarnFormValues): Api.StartMakerRequest => {
  // both fee properties need to be provided.
  // prevent providing an invalid value by setting the ignored prop to zero
  const cjfee_a = isAbsoluteOffer(values.offertype) ? values.feeAbs!.value! : 0
  const cjfee_r = isRelativeOffer(values.offertype) ? values.feeRel : 0
  return {
    ordertype: values.offertype,
    minsize: values.minsize!.value!,
    cjfee_a,
    cjfee_r,
  }
}

interface EarnProps {
  wallet: CurrentWallet
}

export default function Earn({ wallet }: EarnProps) {
  const { t } = useTranslation()
  const settings = useSettings()
  const currentWalletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [serviceInfoAlert, setServiceInfoAlert] = useState<SimpleAlert>()
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isWaitingMakerStart, setIsWaitingMakerStart] = useState(false)
  const [isWaitingMakerStop, setIsWaitingMakerStop] = useState(false)
  const [isShowReport, setIsShowReport] = useState(false)
  const [isShowOrderbook, setIsShowOrderbook] = useState(false)

  const [initialValues, setInitialValues] = useState(initialFormValues())

  const fidelityBonds = useMemo(() => {
    return currentWalletInfo?.fidelityBondSummary.fbOutputs || []
  }, [currentWalletInfo])

  const [moveToJarFidelityBondId, setMoveToJarFidelityBondId] = useState<Api.UtxoId>()
  const [renewFidelityBondId, setRenewFidelityBondId] = useState<Api.UtxoId>()

  const isSufficientFundsAvailable = useMemo(
    () => (currentWalletInfo?.balanceSummary.calculatedAvailableBalanceInSats ?? 0) > 0,
    [currentWalletInfo],
  )

  const isOperationDisabled = useMemo(() => {
    return !isSufficientFundsAvailable || serviceInfo?.rescanning === true || isWaitingMakerStart || isWaitingMakerStop
  }, [isSufficientFundsAvailable, serviceInfo, isWaitingMakerStart, isWaitingMakerStop])

  const startMakerService = useCallback(
    (values: EarnFormValues) => {
      setIsSending(true)
      setIsWaitingMakerStart(true)

      // There is no response data to check if maker got started:
      // Wait for the websocket or session response!
      return (
        Api.postMakerStart({ ...wallet }, toStartMakerRequest(values))
          .then((res) => (res.ok ? true : Api.Helper.throwError(res)))
          // show the loader a little longer to avoid flickering
          .then((result) => new Promise((r) => setTimeout(() => r(result), 200)))
          .catch((e) => {
            setIsWaitingMakerStart(false)
            throw e
          })
          .finally(() => setIsSending(false))
      )
    },
    [wallet],
  )

  const stopMakerService = useCallback(() => {
    setIsSending(true)
    setIsWaitingMakerStop(true)

    // There is no response data to check if maker got stopped:
    // Wait for the websocket or session response!
    return Api.getMakerStop({ ...wallet })
      .then((res) => (res.ok ? true : Api.Helper.throwError(res)))
      .then((result) => new Promise((r) => setTimeout(() => r(result), MAKER_STOP_RESPONSE_DELAY_MS)))
      .catch((e) => {
        setIsWaitingMakerStop(false)
        throw e
      })
      .finally(() => setIsSending(false))
  }, [wallet])

  useEffect(() => {
    if (isSending) return

    const abortCtrl = new AbortController()

    setIsLoading(true)

    const reloadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal })
    const reloadingCurrentWalletInfo = reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal })

    Promise.all([reloadingServiceInfo, reloadingCurrentWalletInfo])
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [isSending, reloadServiceInfo, reloadCurrentWalletInfo])

  useEffect(() => {
    if (isSending) return

    const makerRunning = serviceInfo?.makerRunning === true

    const waitingForMakerToStart = isWaitingMakerStart && !makerRunning
    setIsWaitingMakerStart(waitingForMakerToStart)

    const waitingForMakerToStop = isWaitingMakerStop && makerRunning
    setIsWaitingMakerStop(waitingForMakerToStop)

    const waiting = waitingForMakerToStart || waitingForMakerToStop

    setServiceInfoAlert((current) => {
      if (!waiting && makerRunning) {
        return { variant: 'success', message: t('earn.alert_running') }
      } else if (!waiting) {
        return undefined
      }
      return current
    })
  }, [isSending, serviceInfo, isWaitingMakerStart, isWaitingMakerStop, t])

  const reloadFidelityBonds = useCallback(
    ({ delay }: { delay: number }) => {
      const abortCtrl = new AbortController()

      setIsLoading(true)

      new Promise((resolve) => {
        setTimeout(async () => {
          resolve(await reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal }))
        }, delay)
      })
        .catch((err) => {
          if (abortCtrl.signal.aborted) return
          setAlert({ variant: 'danger', message: err.message || t('global.errors.reason_unknown') })
        })
        .finally(() => {
          if (abortCtrl.signal.aborted) return
          setIsLoading(false)
        })
    },
    [reloadCurrentWalletInfo, t],
  )

  const onSubmitStart = useCallback(
    async (values: EarnFormValues) => {
      if (isLoading || isSending || isWaitingMakerStart || isWaitingMakerStop) {
        return
      }

      setAlert(undefined)

      try {
        persistFormValues(values)

        setServiceInfoAlert({ variant: 'success', message: t('earn.alert_starting') })

        await startMakerService(values)

        setInitialValues(initialFormValues())
      } catch (e: any) {
        setServiceInfoAlert(undefined)
        setAlert({ variant: 'danger', message: e.message || t('global.errors.reason_unknown') })
      }
    },
    [startMakerService, isLoading, isSending, isWaitingMakerStart, isWaitingMakerStop, t],
  )

  const onSubmitStop = useCallback(async () => {
    if (isLoading || isSending || isWaitingMakerStart || isWaitingMakerStop) {
      return
    }

    setAlert(undefined)

    try {
      setServiceInfoAlert({ variant: 'success', message: t('earn.alert_stopping') })
      await stopMakerService()
    } catch (e: any) {
      setServiceInfoAlert(undefined)
      setAlert({ variant: 'danger', message: e.message || t('global.errors.reason_unknown') })
    }
  }, [stopMakerService, isLoading, isSending, isWaitingMakerStart, isWaitingMakerStop, t])

  return (
    <div className={styles.earn}>
      <PageTitle title={t('earn.title')} subtitle={t('earn.subtitle')} />

      <rb.Row className="mb-2">
        <rb.Col>
          <rb.Fade in={serviceInfo?.coinjoinInProgress} mountOnEnter={true} unmountOnExit={true}>
            <rb.Alert variant="info" className="mb-4">
              {t('earn.alert_coinjoin_in_progress')}
            </rb.Alert>
          </rb.Fade>
          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
          {serviceInfoAlert && <rb.Alert variant={serviceInfoAlert.variant}>{serviceInfoAlert.message}</rb.Alert>}
          {!serviceInfo?.coinjoinInProgress &&
            !serviceInfo?.makerRunning &&
            !isWaitingMakerStart &&
            !isWaitingMakerStop && <p className="text-secondary mb-4">{t('earn.market_explainer')}</p>}
          {serviceInfo?.makerRunning &&
            (serviceInfo?.offers && serviceInfo?.nickname ? (
              <>
                {serviceInfo.offers.map((offer, index) => (
                  <CurrentOffer key={index} offer={offer} nickname={serviceInfo.nickname || '-'} />
                ))}
              </>
            ) : (
              <rb.Placeholder as="div" animation="wave">
                <rb.Placeholder xs={12} className={styles.offerLoader} />
              </rb.Placeholder>
            ))}
          {!serviceInfo?.coinjoinInProgress && (
            <>
              <PageTitle
                title={t('earn.title_fidelity_bonds', { count: fidelityBonds.length })}
                subtitle={t('earn.subtitle_fidelity_bonds')}
              />
              <div className="d-flex flex-column gap-3 mb-4">
                {currentWalletInfo && moveToJarFidelityBondId && (
                  <SpendFidelityBondModal
                    show={true}
                    fidelityBondId={moveToJarFidelityBondId}
                    wallet={wallet}
                    walletInfo={currentWalletInfo}
                    destinationJarIndex={0}
                    onClose={({ mustReload }) => {
                      setMoveToJarFidelityBondId(undefined)
                      if (mustReload) {
                        reloadFidelityBonds({ delay: 0 })
                      }
                    }}
                  />
                )}
                {currentWalletInfo && renewFidelityBondId && (
                  <RenewFidelityBondModal
                    show={true}
                    fidelityBondId={renewFidelityBondId}
                    wallet={wallet}
                    walletInfo={currentWalletInfo}
                    onClose={({ mustReload }) => {
                      setRenewFidelityBondId(undefined)
                      if (mustReload) {
                        reloadFidelityBonds({ delay: 0 })
                      }
                    }}
                  />
                )}
                {fidelityBonds.map((fidelityBond, index) => {
                  const isExpired = !fb.utxo.isLocked(fidelityBond)
                  const actionsEnabled =
                    isExpired &&
                    serviceInfo &&
                    !serviceInfo.coinjoinInProgress &&
                    !serviceInfo.makerRunning &&
                    !serviceInfo.rescanning &&
                    !isWaitingMakerStart &&
                    !isWaitingMakerStop &&
                    !isLoading
                  return (
                    <ExistingFidelityBond key={index} fidelityBond={fidelityBond}>
                      {actionsEnabled && (
                        <div className="mt-4 d-flex gap-2">
                          <rb.Button
                            variant={settings.theme === 'dark' ? 'light' : 'dark'}
                            className="w-100 d-flex justify-content-center align-items-center"
                            disabled={moveToJarFidelityBondId !== undefined}
                            onClick={() => setMoveToJarFidelityBondId(fidelityBond.utxo)}
                          >
                            <Sprite className="me-1 mb-1" symbol="unlock" width="24" height="24" />
                            {t('earn.fidelity_bond.existing.button_spend')}
                          </rb.Button>
                          <rb.Button
                            variant={settings.theme === 'dark' ? 'light' : 'dark'}
                            className="w-100 d-flex justify-content-center align-items-center"
                            disabled={renewFidelityBondId !== undefined}
                            onClick={() => setRenewFidelityBondId(fidelityBond.utxo)}
                          >
                            <Sprite className="me-1" symbol="refresh" width="24" height="24" />
                            {t('earn.fidelity_bond.existing.button_renew')}
                          </rb.Button>
                        </div>
                      )}
                    </ExistingFidelityBond>
                  )
                })}
                <>
                  {!serviceInfo?.makerRunning &&
                    !serviceInfo?.coinjoinInProgress &&
                    !serviceInfo?.rescanning &&
                    !isWaitingMakerStart &&
                    !isWaitingMakerStop &&
                    (!isLoading && currentWalletInfo ? (
                      <CreateFidelityBond
                        otherFidelityBondExists={fidelityBonds.length > 0}
                        wallet={wallet}
                        walletInfo={currentWalletInfo}
                        onDone={() => reloadFidelityBonds({ delay: RELOAD_FIDELITY_BONDS_DELAY_MS })}
                      />
                    ) : (
                      <rb.Placeholder as="div" animation="wave">
                        <rb.Placeholder xs={12} className={styles.fidelityBondsLoader} />
                      </rb.Placeholder>
                    ))}
                </>
              </div>
            </>
          )}

          {!serviceInfo?.coinjoinInProgress && (
            <>
              {!serviceInfo?.makerRunning && !isWaitingMakerStart && !isWaitingMakerStop ? (
                <EarnForm
                  initialValues={initialValues}
                  onSubmit={onSubmitStart}
                  walletInfo={currentWalletInfo}
                  isLoading={isLoading}
                  disabled={isOperationDisabled}
                  submitButtonText={(_) => {
                    return (
                      <>
                        {isWaitingMakerStart || isWaitingMakerStop ? (
                          <>
                            <rb.Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            {isWaitingMakerStart && t('earn.text_starting')}
                            {isWaitingMakerStop && t('earn.text_stopping')}
                          </>
                        ) : (
                          <>{serviceInfo?.makerRunning === true ? t('earn.button_stop') : t('earn.button_start')}</>
                        )}
                      </>
                    )
                  }}
                />
              ) : (
                <Formik initialValues={{}} onSubmit={onSubmitStop}>
                  {({ handleSubmit, isSubmitting }) => (
                    <rb.Form onSubmit={handleSubmit} noValidate>
                      <rb.Button
                        className="w-100 mb-4"
                        variant="dark"
                        size="lg"
                        type="submit"
                        disabled={
                          isLoading ||
                          serviceInfo?.makerRunning !== true ||
                          serviceInfo?.rescanning === true ||
                          isSubmitting ||
                          isWaitingMakerStart ||
                          isWaitingMakerStop
                        }
                      >
                        <div className="d-flex justify-content-center align-items-center">
                          {isWaitingMakerStart || isWaitingMakerStop ? (
                            <>
                              <rb.Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              {isWaitingMakerStart && t('earn.text_starting')}
                              {isWaitingMakerStop && t('earn.text_stopping')}
                            </>
                          ) : (
                            <>{t('earn.button_stop')}</>
                          )}
                        </div>
                      </rb.Button>
                    </rb.Form>
                  )}
                </Formik>
              )}
            </>
          )}
        </rb.Col>
      </rb.Row>
      <rb.Row className="mb-4">
        <rb.Col className="d-flex justify-content-center">
          <OrderbookOverlay
            show={isShowOrderbook}
            onHide={() => setIsShowOrderbook(false)}
            nickname={serviceInfo?.nickname ?? undefined}
          />
          <rb.Button
            variant="outline-dark"
            className="border-0 d-inline-flex align-items-center"
            onClick={() => setIsShowOrderbook(true)}
          >
            <Sprite symbol="globe" width="24" height="24" className="me-2" />
            {t('earn.button_show_orderbook')}
          </rb.Button>
        </rb.Col>
        <rb.Col className="d-flex justify-content-center">
          <EarnReportOverlay show={isShowReport} onHide={() => setIsShowReport(false)} />

          <rb.Button
            variant="outline-dark"
            className="border-0 d-inline-flex align-items-center"
            onClick={() => setIsShowReport(true)}
          >
            <Sprite symbol="show" width="24" height="24" className="me-2" />
            {t('earn.button_show_report')}
          </rb.Button>
        </rb.Col>
      </rb.Row>
    </div>
  )
}
