import React from 'react'
import { useEffect, useState } from 'react'
import { Formik } from 'formik'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet } from '../context/WalletContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import Sprite from './Sprite'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import * as Api from '../libs/JmWalletApi'
import styles from './Earn.module.css'

const OFFERTYPE_REL = 'sw0reloffer'
const OFFERTYPE_ABS = 'sw0absoffer'
const OFFERTYPES = [OFFERTYPE_REL, OFFERTYPE_ABS]

// In order to prevent state mismatch, the 'maker stop' response is delayed shortly.
// Even though the API response suggests that the maker has started or stopped immediately, it seems that this is not always the case.
// There is currently no way to know for sure - adding a delay at least mitigates the problem.
// 2022-04-26: With value of 2_000ms, no state corruption could be provoked in a local dev setup.
const MAKER_STOP_RESPONSE_DELAY_MS = 2_000

const YieldgenReport = ({ lines, maxAmountOfRows = 25 }) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const empty = !lines || lines.length < 2
  const headers = empty ? [] : lines[0].split(',')

  const linesWithoutHeader = empty
    ? []
    : lines
        .slice(1, lines.length)
        .map((line) => line.split(','))
        .reverse()

  const visibleLines = linesWithoutHeader.slice(0, maxAmountOfRows)

  return (
    <div className="mt-2 mb-3">
      {empty && <rb.Alert variant="info">{t('earn.alert_empty_report')}</rb.Alert>}
      {!empty && (
        <>
          <rb.Table striped bordered hover variant={settings.theme} responsive>
            <thead>
              <tr>
                {headers.map((name, index) => (
                  <th key={`header_${index}`}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleLines.map((line, trIndex) => (
                <tr key={`tr_${trIndex}`}>
                  {line.map((val, tdIndex) => (
                    <td key={`td_${tdIndex}`}>{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                {headers.map((name, index) => (
                  <th key={`footer_${index}`}>{name}</th>
                ))}
              </tr>
            </tfoot>
          </rb.Table>
          <div className="mt-1 d-flex justify-content-end">
            <small>
              {t('earn.text_report_length', {
                visibleLines: visibleLines.length,
                linesWithoutHeader: linesWithoutHeader.length,
              })}
            </small>
          </div>
        </>
      )}
    </div>
  )
}

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

const persistOffertype = (value) => {
  window.localStorage.setItem('jm-offertype', value)
}

const persistFeeRel = (value) => {
  window.localStorage.setItem('jm-feeRel', value)
}

const persistFeeAbs = (value) => {
  window.localStorage.setItem('jm-feeAbs', value)
}

const persistMinsize = (value) => {
  window.localStorage.setItem('jm-minsize', value)
}

const persistFormValues = (values) => {
  persistOffertype(values.offertype)
  persistFeeRel(values.feeRel)
  persistFeeAbs(values.feeAbs)
  persistMinsize(values.minsize)
}

export default function Earn() {
  const { t } = useTranslation()
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const [alert, setAlert] = useState(null)
  const [serviceInfoAlert, setServiceInfoAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isWaitingMakerStart, setIsWaitingMakerStart] = useState(false)
  const [isWaitingMakerStop, setIsWaitingMakerStop] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)
  const [isShowReport, setIsShowReport] = useState(false)
  const [yieldgenReportLines, setYieldgenReportLines] = useState([])

  const startMakerService = (cjfee_a, cjfee_r, ordertype, minsize) => {
    setIsSending(true)
    setIsWaitingMakerStart(true)

    const { name: walletName, token } = currentWallet
    const data = {
      cjfee_a,
      cjfee_r,
      ordertype,
      minsize,
    }

    // There is no response data to check if maker got started:
    // Wait for the websocket or session response!
    return (
      Api.postMakerStart({ walletName, token }, data)
        .then((res) => (res.ok ? true : Api.Helper.throwError(res)))
        // show the loader a little longer to avoid flickering
        .then((_) => new Promise((r) => setTimeout(r, 200)))
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
      .then((_) => new Promise((r) => setTimeout(r, MAKER_STOP_RESPONSE_DELAY_MS)))
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

    reloadServiceInfo({ signal: abortCtrl.signal })
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, isSending, reloadServiceInfo])

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

  useEffect(() => {
    if (!isShowReport) return

    const abortCtrl = new AbortController()
    setIsReportLoading(true)

    Api.getYieldgenReport({ signal: abortCtrl.signal })
      .then((res) => {
        if (res.ok) return res.json()
        // 404 is returned till the maker is started at least once
        if (res.status === 404) return {}
        return Api.Helper.throwError(res, t('earn.error_loading_report_failed'))
      })
      .then((data) => setYieldgenReportLines(data.yigen_data))
      .catch((err) => {
        console.log(`Error while loading yield generator`, err)
      })
      // show the loader a little longer to avoid flickering
      .then((_) => new Promise((r) => setTimeout(r, 200)))
      .finally(() => {
        !abortCtrl.signal.aborted && setIsReportLoading(false)
      })

    return () => abortCtrl.abort()
  }, [serviceInfo, isShowReport, t])

  const feeRelMin = 0.0
  const feeRelMax = 0.1 // 10%
  const feeRelPercentageStep = 0.0001

  const initialValues = {
    offertype: (settings.useAdvancedWalletMode && window.localStorage.getItem('jm-offertype')) || OFFERTYPE_REL,
    feeRel: parseFloat(window.localStorage.getItem('jm-feeRel')) || 0.000_3,
    feeAbs: parseInt(window.localStorage.getItem('jm-feeAbs'), 10) || 250,
    minsize: parseInt(window.localStorage.getItem('jm-minsize'), 10) || 100_000,
  }

  const validate = (values) => {
    const errors = {}
    if (!OFFERTYPES.includes(values.offertype)) {
      // currently no need for translation, this should never occur -> input is controlled by toggle
      errors.offertype = `Offertype must be one of ${OFFERTYPES.join(',')}`
    }
    if (!(values.feeRel >= feeRelMin && values.feeRel <= feeRelMax)) {
      errors.feeRel = t('earn.feedback_invalid_rel_fee', {
        feeRelPercentageMin: `${factorToPercentage(feeRelMin)}%`,
        feeRelPercentageMax: `${factorToPercentage(feeRelMax)}%`,
      })
    }
    if (values.feeAbs < 0) {
      errors.feeAbs = t('earn.feedback_invalid_abs_fee')
    }
    if (values.minsize < 0) {
      errors.minsize = t('earn.feedback_invalid_min_amount')
    }
    return errors
  }

  const onSubmit = async (values, { setSubmitting }) => {
    if (isLoading || isSending || isWaitingMakerStart || isWaitingMakerStop) {
      setSubmitting(false)
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
        await startMakerService(values.feeAbs, values.feeRel, values.offertype, values.minsize)
      }
    } catch (e) {
      setServiceInfoAlert(null)
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="earn">
      <rb.Row>
        <rb.Col>
          <PageTitle title={t('earn.title')} subtitle={t('earn.subtitle')} />

          <rb.Fade in={serviceInfo?.coinjoinInProgress} mountOnEnter={true} unmountOnExit={true}>
            <rb.Alert variant="info" className="mb-4">
              {t('earn.alert_coinjoin_in_progress')}
            </rb.Alert>
          </rb.Fade>

          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

          {serviceInfoAlert && <rb.Alert variant={serviceInfoAlert.variant}>{serviceInfoAlert.message}</rb.Alert>}

          {!serviceInfo?.coinjoinInProgress && (
            <Formik initialValues={initialValues} validate={validate} onSubmit={onSubmit}>
              {({ handleSubmit, setFieldValue, handleChange, handleBlur, values, touched, errors, isSubmitting }) => (
                <rb.Form onSubmit={handleSubmit} noValidate>
                  {!serviceInfo?.makerRunning && !isWaitingMakerStart && !isWaitingMakerStop && (
                    <>
                      {settings.useAdvancedWalletMode && (
                        <rb.Form.Group className="mb-3" controlId="offertype">
                          <ToggleSwitch
                            label={t('earn.toggle_rel_offer')}
                            initialValue={values.offertype === OFFERTYPE_REL}
                            onToggle={(isToggled) =>
                              setFieldValue('offertype', isToggled ? OFFERTYPE_REL : OFFERTYPE_ABS, true)
                            }
                            disabled={isLoading || isSubmitting}
                          />
                        </rb.Form.Group>
                      )}
                      {values.offertype === OFFERTYPE_REL ? (
                        <rb.Form.Group className="mb-3" controlId="feeRel">
                          <rb.Form.Label className="mb-0">
                            {t('earn.label_rel_fee', {
                              fee: values.feeRel !== '' ? `(${factorToPercentage(values.feeRel)}%)` : '',
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
                            <rb.Form.Control
                              className="slashed-zeroes"
                              type="number"
                              name="feeRel"
                              disabled={isSubmitting}
                              onChange={(e) => {
                                const value = e.target.value || ''
                                setFieldValue('feeRel', value && percentageToFactor(e.target.value), true)
                              }}
                              onBlur={handleBlur}
                              value={factorToPercentage(values.feeRel)}
                              isValid={touched.feeRel && !errors.feeRel}
                              isInvalid={touched.feeRel && errors.feeRel}
                              min={0}
                              step={feeRelPercentageStep}
                            />
                          )}
                          <rb.Form.Control.Feedback type="invalid">{errors.feeRel}</rb.Form.Control.Feedback>
                        </rb.Form.Group>
                      ) : (
                        <rb.Form.Group className="mb-3" controlId="feeAbs">
                          <rb.Form.Label className="mb-0">{t('earn.label_abs_fee')}</rb.Form.Label>
                          <div className="mb-2">
                            <rb.Form.Text className="text-secondary">{t('earn.description_abs_fee')}</rb.Form.Text>
                          </div>
                          {isLoading ? (
                            <rb.Placeholder as="div" animation="wave">
                              <rb.Placeholder xs={12} className={styles['input-loader']} />
                            </rb.Placeholder>
                          ) : (
                            <rb.Form.Control
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
                          )}
                          <rb.Form.Control.Feedback type="invalid">{errors.feeAbs}</rb.Form.Control.Feedback>
                        </rb.Form.Group>
                      )}
                      {settings.useAdvancedWalletMode && (
                        <rb.Form.Group className="mb-3" controlId="minsize">
                          <rb.Form.Label>{t('earn.label_min_amount')}</rb.Form.Label>
                          {isLoading ? (
                            <rb.Placeholder as="div" animation="wave">
                              <rb.Placeholder xs={12} className={styles['input-loader']} />
                            </rb.Placeholder>
                          ) : (
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
                          )}
                          <rb.Form.Control.Feedback type="invalid">{errors.minsize}</rb.Form.Control.Feedback>
                        </rb.Form.Group>
                      )}
                    </>
                  )}

                  <rb.Button
                    variant="dark"
                    type="submit"
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
                </rb.Form>
              )}
            </Formik>
          )}
        </rb.Col>
      </rb.Row>

      {settings.useAdvancedWalletMode && (
        <rb.Row className="mt-5 mb-3">
          <rb.Col>
            <rb.Button
              variant="outline-dark"
              className="border-0 mb-2 d-inline-flex align-items-center"
              onClick={(e) => {
                e.preventDefault()
                setIsShowReport(!isShowReport)
              }}
            >
              <Sprite symbol={isShowReport ? 'hide' : 'show'} width="24" height="24" className="me-2" />
              {isShowReport ? t('earn.button_hide_report') : t('earn.button_show_report')}
              {isReportLoading && (
                <rb.Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="ms-2 me-1"
                />
              )}
            </rb.Button>
          </rb.Col>
          <rb.Fade in={isShowReport} mountOnEnter={true} unmountOnExit={true}>
            <rb.Col md={12}>
              <YieldgenReport lines={yieldgenReportLines} />
            </rb.Col>
          </rb.Fade>
        </rb.Row>
      )}
    </div>
  )
}
