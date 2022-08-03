import React, { useEffect, useState } from 'react'
import { Formik } from 'formik'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo } from '../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import Sprite from './Sprite'
import PageTitle from './PageTitle'
import SegmentedTabs from './SegmentedTabs'
import { CreateFidelityBond } from './fb/CreateFidelityBond'
import { ExistingFidelityBond } from './fb/ExistingFidelityBond'
import { EarnReportOverlay } from './EarnReport'
import * as Api from '../libs/JmWalletApi'
import styles from './Earn.module.css'
import { OrderbookOverlay } from './Orderbook'

// In order to prevent state mismatch, the 'maker stop' response is delayed shortly.
// Even though the API response suggests that the maker has started or stopped immediately, it seems that this is not always the case.
// There is currently no way to know for sure - adding a delay at least mitigates the problem.
// 2022-04-26: With value of 2_000ms, no state corruption could be provoked in a local dev setup.
const MAKER_STOP_RESPONSE_DELAY_MS = 2_000

// When reloading UTXO after creating a fidelity bond, use a delay to make sure
// that the UTXO corresponding to the fidelity bond is correctly marked as such.
const RELOAD_FIDELITY_BONDS_DELAY_MS = 2_000

const OFFERTYPE_REL = 'sw0reloffer'
const OFFERTYPE_ABS = 'sw0absoffer'

const isRelativeOffer = (offertype) => offertype === OFFERTYPE_REL
const isAbsoluteOffer = (offertype) => offertype === OFFERTYPE_ABS

const FORM_INPUT_LOCAL_STORAGE_KEYS = {
  offertype: 'jm-offertype',
  feeRel: 'jm-feeRel',
  feeAbs: 'jm-feeAbs',
  minsize: 'jm-minsize',
}

const FORM_INPUT_DEFAULT_VALUES = {
  offertype: OFFERTYPE_REL,
  feeRel: 0.000_3,
  feeAbs: 250,
  minsize: 100_000,
}

const persistFormValues = (values) => {
  window.localStorage.setItem(FORM_INPUT_LOCAL_STORAGE_KEYS.offertype, values.offertype)
  window.localStorage.setItem(FORM_INPUT_LOCAL_STORAGE_KEYS.minsize, values.minsize)

  if (isRelativeOffer(values.offertype)) {
    window.localStorage.setItem(FORM_INPUT_LOCAL_STORAGE_KEYS.feeRel, values.feeRel)
  }
  if (isAbsoluteOffer(values.offertype)) {
    window.localStorage.setItem(FORM_INPUT_LOCAL_STORAGE_KEYS.feeAbs, values.feeAbs)
  }
}

const initialFormValues = (settings) => ({
  offertype:
    window.localStorage.getItem(FORM_INPUT_LOCAL_STORAGE_KEYS.offertype) || FORM_INPUT_DEFAULT_VALUES.offertype,
  feeRel:
    parseFloat(window.localStorage.getItem(FORM_INPUT_LOCAL_STORAGE_KEYS.feeRel)) || FORM_INPUT_DEFAULT_VALUES.feeRel,
  feeAbs:
    parseInt(window.localStorage.getItem(FORM_INPUT_LOCAL_STORAGE_KEYS.feeAbs), 10) || FORM_INPUT_DEFAULT_VALUES.feeAbs,
  minsize:
    parseInt(window.localStorage.getItem(FORM_INPUT_LOCAL_STORAGE_KEYS.minsize), 10) ||
    FORM_INPUT_DEFAULT_VALUES.minsize,
})

const percentageToFactor = (val, precision = 6) => {
  // Value cannot just be divided
  // e.g. ✗ 0.0027 / 100 == 0.000027000000000000002
  // but: ✓ Number((0.0027 / 100).toFixed(6)) = 0.000027
  return Number((val / 100).toFixed(precision))
}

const factorToPercentage = (val, precision = 6) => {
  // Value cannot just be divided
  // e.g. ✗ 0.000027 * 100 == 0.0026999999999999997
  // but: ✓ Number((0.000027 * 100).toFixed(6)) = 0.0027
  return Number((val * 100).toFixed(precision))
}

export default function Earn() {
  const { t } = useTranslation()
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const currentWalletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()

  const [showSettings, setShowSettings] = useState(false)
  const [alert, setAlert] = useState(null)
  const [serviceInfoAlert, setServiceInfoAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isWaitingMakerStart, setIsWaitingMakerStart] = useState(false)
  const [isWaitingMakerStop, setIsWaitingMakerStop] = useState(false)
  const [isShowReport, setIsShowReport] = useState(false)
  const [isShowOrderbook, setIsShowOrderbook] = useState(false)
  const [fidelityBonds, setFidelityBonds] = useState([])

  const startMakerService = (ordertype, minsize, cjfee_a, cjfee_r) => {
    setIsSending(true)
    setIsWaitingMakerStart(true)

    const { name: walletName, token } = currentWallet
    const data = {
      ordertype,
      minsize,
      cjfee_a,
      cjfee_r,
    }

    // There is no response data to check if maker got started:
    // Wait for the websocket or session response!
    return (
      Api.postMakerStart({ walletName, token }, data)
        .then((res) => (res.ok ? true : Api.Helper.throwError(res)))
        // show the loader a little longer to avoid flickering
        .then((result) => new Promise((r) => setTimeout(() => r(result), 200)))
        .catch((e) => {
          setIsWaitingMakerStart(false)
          throw e
        })
        .finally(() => setIsSending(false))
    )
  }

  const stopMakerService = () => {
    setIsSending(true)
    setIsWaitingMakerStop(true)

    const { name: walletName, token } = currentWallet

    // There is no response data to check if maker got stopped:
    // Wait for the websocket or session response!
    return Api.getMakerStop({ walletName, token })
      .then((res) => (res.ok ? true : Api.Helper.throwError(res)))
      .then((result) => new Promise((r) => setTimeout(() => r(result), MAKER_STOP_RESPONSE_DELAY_MS)))
      .catch((e) => {
        setIsWaitingMakerStop(false)
        throw e
      })
      .finally(() => setIsSending(false))
  }

  useEffect(() => {
    if (isSending) return

    const abortCtrl = new AbortController()

    setIsLoading(true)

    const reloadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal })
    const reloadingCurrentWalletInfo = reloadCurrentWalletInfo({ signal: abortCtrl.signal }).then((info) => {
      if (!abortCtrl.signal.aborted) {
        setFidelityBonds(info.fidelityBondSummary.fbOutputs)
      }
    })

    Promise.all([reloadingServiceInfo, reloadingCurrentWalletInfo])
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, isSending, reloadServiceInfo, reloadCurrentWalletInfo])

  useEffect(() => {
    if (isSending) return

    const makerRunning = serviceInfo?.makerRunning

    const waitingForMakerToStart = isWaitingMakerStart && !makerRunning
    setIsWaitingMakerStart(waitingForMakerToStart)

    const waitingForMakerToStop = isWaitingMakerStop && makerRunning
    setIsWaitingMakerStop(waitingForMakerToStop)

    const waiting = waitingForMakerToStart || waitingForMakerToStop

    setServiceInfoAlert((current) => {
      if (!waiting && makerRunning) {
        return { variant: 'success', message: t('earn.alert_running') }
      } else if (!waiting) {
        return null
      }
      return current
    })
  }, [isSending, serviceInfo, isWaitingMakerStart, isWaitingMakerStop, t])

  const reloadFidelityBonds = ({ delay }) => {
    const abortCtrl = new AbortController()

    setIsLoading(true)

    new Promise((resolve) => {
      setTimeout(() => {
        resolve(reloadCurrentWalletInfo({ signal: abortCtrl.signal }))
      }, delay)
    })
      .then((info) => setFidelityBonds(info.fidelityBondSummary.fbOutputs))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))
  }

  const feeRelMin = 0.0
  const feeRelMax = 0.1 // 10%
  const feeRelPercentageStep = 0.0001

  const initialValues = initialFormValues(settings)

  const validate = (values) => {
    const errors = {}
    const isRelOffer = isRelativeOffer(values.offertype)
    const isAbsOffer = isAbsoluteOffer(values.offertype)

    if (!isRelOffer && !isAbsOffer) {
      // currently no need for translation, this should never occur -> input is controlled by toggle
      errors.offertype = 'Offertype is not supported'
    }

    if (isRelOffer) {
      if (typeof values.feeRel !== 'number' || values.feeRel < feeRelMin || values.feeRel > feeRelMax) {
        errors.feeRel = t('earn.feedback_invalid_rel_fee', {
          feeRelPercentageMin: `${factorToPercentage(feeRelMin)}%`,
          feeRelPercentageMax: `${factorToPercentage(feeRelMax)}%`,
        })
      }
    }

    if (isAbsOffer) {
      if (typeof values.feeAbs !== 'number' || values.feeAbs < 0) {
        errors.feeAbs = t('earn.feedback_invalid_abs_fee')
      }
    }

    if (typeof values.minsize !== 'number' || values.minsize < 0) {
      errors.minsize = t('earn.feedback_invalid_min_amount')
    }

    return errors
  }

  const onSubmit = async (values) => {
    if (isLoading || isSending || isWaitingMakerStart || isWaitingMakerStop) {
      return
    }

    setAlert(null)

    try {
      if (serviceInfo?.makerRunning === true) {
        setServiceInfoAlert({ variant: 'success', message: t('earn.alert_stopping') })
        await stopMakerService()
      } else {
        persistFormValues(values)

        setServiceInfoAlert({ variant: 'success', message: t('earn.alert_starting') })

        // both fee properties need to be provided.
        // prevent providing an invalid value by setting the ignored prop to zero
        const feeAbs = isAbsoluteOffer(values.offertype) ? values.feeAbs : 0
        const feeRel = isRelativeOffer(values.offertype) ? values.feeRel : 0
        await startMakerService(values.offertype, values.minsize, feeAbs, feeRel)
      }
    } catch (e) {
      setServiceInfoAlert(null)
      setAlert({ variant: 'danger', message: e.message })
    }
  }

  return (
    <div className={styles['earn']}>
      <PageTitle title={t('earn.title')} subtitle={t('earn.subtitle')} />

      <rb.Row>
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
          {!serviceInfo?.coinjoinInProgress && (
            <>
              <PageTitle
                title={fidelityBonds.length > 0 ? t('earn.title_fidelity_bond_exists') : t('earn.title_fidelity_bonds')}
                subtitle={t('earn.subtitle_fidelity_bonds')}
              />
              <div className="d-flex flex-column gap-3">
                {fidelityBonds.length > 0 &&
                  fidelityBonds.map((utxo, index) => <ExistingFidelityBond key={index} utxo={utxo} />)}

                <>
                  {!serviceInfo?.makerRunning &&
                    !isWaitingMakerStart &&
                    !isWaitingMakerStop &&
                    (!isLoading && currentWalletInfo ? (
                      <CreateFidelityBond
                        otherFidelityBondExists={fidelityBonds.length > 0}
                        accountBalances={currentWalletInfo.balanceSummary.accountBalances}
                        totalBalance={currentWalletInfo.balanceSummary.totalBalance}
                        wallet={currentWallet}
                        walletInfo={currentWalletInfo}
                        onDone={() => reloadFidelityBonds({ delay: RELOAD_FIDELITY_BONDS_DELAY_MS })}
                      />
                    ) : (
                      <rb.Placeholder as="div" animation="wave">
                        <rb.Placeholder xs={12} className={styles['fb-loader']} />
                      </rb.Placeholder>
                    ))}
                </>
              </div>
            </>
          )}
          {!serviceInfo?.coinjoinInProgress && (
            <Formik initialValues={initialValues} validate={validate} onSubmit={onSubmit}>
              {({ handleSubmit, setFieldValue, handleChange, handleBlur, values, touched, errors, isSubmitting }) => (
                <rb.Form onSubmit={handleSubmit} noValidate>
                  {!serviceInfo?.makerRunning && !isWaitingMakerStart && !isWaitingMakerStop && (
                    <div className={styles['settings-container']}>
                      <rb.Button
                        variant={`${settings.theme}`}
                        className={`${styles['settings-btn']} d-flex align-items-center`}
                        onClick={() => setShowSettings((current) => !current)}
                      >
                        {t('earn.button_settings')}
                        <Sprite
                          symbol={`caret-${showSettings ? 'up' : 'down'}`}
                          className="ms-1"
                          width="20"
                          height="20"
                        />
                      </rb.Button>
                      {showSettings && (
                        <div className="my-4">
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
                              onChange={(tab, checked) => {
                                checked && setFieldValue('offertype', tab.value, true)
                              }}
                              initialValue={values.offertype}
                              disabled={isLoading || isSubmitting}
                            />
                          </rb.Form.Group>
                          {values.offertype === OFFERTYPE_REL ? (
                            <rb.Form.Group className="mb-3" controlId="feeRel">
                              <rb.Form.Label className="mb-0">
                                {t('earn.label_rel_fee', {
                                  fee:
                                    typeof values.feeRel === 'number' ? `(${factorToPercentage(values.feeRel)}%)` : '',
                                })}
                              </rb.Form.Label>
                              <div className="mb-2">
                                <rb.Form.Text className="text-secondary">{t('earn.description_rel_fee')}</rb.Form.Text>
                              </div>
                              {isLoading ? (
                                <rb.Placeholder as="div" animation="wave">
                                  <rb.Placeholder xs={12} className={styles['input-loader']} />
                                </rb.Placeholder>
                              ) : (
                                <rb.InputGroup>
                                  <rb.InputGroup.Text id="feeRel-addon1" className={styles['input-group-text']}>
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
                                      setFieldValue('feeRel', value !== '' ? percentageToFactor(value) : '', true)
                                    }}
                                    onBlur={handleBlur}
                                    value={typeof values.feeRel === 'number' ? factorToPercentage(values.feeRel) : ''}
                                    isValid={touched.feeRel && !errors.feeRel}
                                    isInvalid={touched.feeRel && errors.feeRel}
                                    min={0}
                                    step={feeRelPercentageStep}
                                  />
                                </rb.InputGroup>
                              )}
                              <rb.Form.Control.Feedback type="invalid">{errors.feeRel}</rb.Form.Control.Feedback>
                            </rb.Form.Group>
                          ) : (
                            <rb.Form.Group className="mb-3" controlId="feeAbs">
                              <rb.Form.Label className="mb-0">
                                {t('earn.label_abs_fee', {
                                  fee:
                                    typeof values.feeAbs === 'number'
                                      ? `(${values.feeAbs} ${values.feeAbs === 1 ? 'sat' : 'sats'})`
                                      : '',
                                })}
                              </rb.Form.Label>
                              <div className="mb-2">
                                <rb.Form.Text className="text-secondary">{t('earn.description_abs_fee')}</rb.Form.Text>
                              </div>
                              {isLoading ? (
                                <rb.Placeholder as="div" animation="wave">
                                  <rb.Placeholder xs={12} className={styles['input-loader']} />
                                </rb.Placeholder>
                              ) : (
                                <rb.InputGroup>
                                  <rb.InputGroup.Text id="feeAbs-addon1" className={styles['input-group-text']}>
                                    <Sprite symbol="sats" width="24" height="24" />
                                  </rb.InputGroup.Text>
                                  <rb.Form.Control
                                    aria-label={t('earn.label_abs_fee', { fee: '' })}
                                    className="slashed-zeroes"
                                    type="number"
                                    name="feeAbs"
                                    value={values.feeAbs}
                                    disabled={isSubmitting}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    isValid={touched.feeAbs && !errors.feeAbs}
                                    isInvalid={touched.feeAbs && errors.feeAbs}
                                    min={0}
                                    step={1}
                                  />
                                </rb.InputGroup>
                              )}
                              <rb.Form.Control.Feedback type="invalid">{errors.feeAbs}</rb.Form.Control.Feedback>
                            </rb.Form.Group>
                          )}

                          <rb.Form.Group controlId="minsize">
                            <rb.Form.Label>{t('earn.label_min_amount')}</rb.Form.Label>
                            {isLoading ? (
                              <rb.Placeholder as="div" animation="wave">
                                <rb.Placeholder xs={12} className={styles['input-loader']} />
                              </rb.Placeholder>
                            ) : (
                              <rb.InputGroup>
                                <rb.InputGroup.Text id="minsize-addon1" className={styles['input-group-text']}>
                                  <Sprite symbol="sats" width="24" height="24" />
                                </rb.InputGroup.Text>
                                <rb.Form.Control
                                  className="slashed-zeroes"
                                  type="number"
                                  name="minsize"
                                  value={values.minsize}
                                  disabled={isSubmitting}
                                  onChange={handleChange}
                                  onBlur={handleBlur}
                                  isValid={touched.minsize && !errors.minsize}
                                  isInvalid={touched.minsize && errors.minsize}
                                  min={0}
                                  step={1000}
                                />
                              </rb.InputGroup>
                            )}
                            <rb.Form.Control.Feedback type="invalid">{errors.minsize}</rb.Form.Control.Feedback>
                          </rb.Form.Group>
                        </div>
                      )}

                      <hr className="m-0" />
                    </div>
                  )}
                  <div className="mt-4">
                    <rb.Button
                      variant="dark"
                      type="submit"
                      className={styles['earn-btn']}
                      disabled={isLoading || isSubmitting || isWaitingMakerStart || isWaitingMakerStop}
                    >
                      <div className="d-flex justify-content-center align-items-center">
                        {(isWaitingMakerStart || isWaitingMakerStop) && (
                          <rb.Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                        )}
                        {isWaitingMakerStart || isWaitingMakerStop ? (
                          <>
                            {isWaitingMakerStart && t('earn.text_starting')}
                            {isWaitingMakerStop && t('earn.text_stopping')}
                          </>
                        ) : (
                          <>{serviceInfo?.makerRunning === true ? t('earn.button_stop') : t('earn.button_start')}</>
                        )}
                      </div>
                    </rb.Button>
                  </div>
                </rb.Form>
              )}
            </Formik>
          )}
        </rb.Col>
      </rb.Row>
      <rb.Row className="mt-5 mb-3">
        <rb.Col className="d-flex justify-content-center">
          <OrderbookOverlay show={isShowOrderbook} onHide={() => setIsShowOrderbook(false)} />
          <rb.Button
            variant="outline-dark"
            className="border-0 mb-2 d-inline-flex align-items-center"
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
            className="border-0 mb-2 d-inline-flex align-items-center"
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
