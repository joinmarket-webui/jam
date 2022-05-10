import React, { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Formik } from 'formik'
import * as Api from '../libs/JmWalletApi'
import { useSettings } from '../context/SettingsContext'
import { useServiceInfo, useReloadServiceInfo } from '../context/ServiceInfoContext'
import { useCurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo } from '../context/WalletContext'
import styles from './Jam.module.css'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import Sprite from './Sprite'
import Balance from './Balance'

export default function Jam() {
  const { t } = useTranslation()
  const settings = useSettings()
  const serviceInfo = useServiceInfo()
  const reloadServiceInfo = useReloadServiceInfo()
  const wallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [alert, setAlert] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [destinationIsInternal, setDestinationIsInternal] = useState(false)
  const [collaborativeOperationRunning, setCollaborativeOperationRunning] = useState(false)

  // Todo: Testing toggle is deactivated until https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1260 is merged.
  // const [useInsecureTestingSettings, setUseInsecureTestingSettings] = useState(false)

  // Todo: Discuss if we should hardcode this or let the user pick an account.
  const INTERNAL_DEST_ACCOUNT = 0

  useEffect(() => {
    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)

    const loadingServiceInfo = reloadServiceInfo({ signal: abortCtrl.signal }).catch((err) => {
      const message = err.message || t('send.error_loading_wallet_failed')
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
    })

    const loadingWalletInfo = reloadCurrentWalletInfo({ signal: abortCtrl.signal }).catch((err) => {
      const message = err.message || t('send.error_loading_wallet_failed')
      !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
    })

    Promise.all([loadingServiceInfo, loadingWalletInfo]).finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [reloadServiceInfo, reloadCurrentWalletInfo, t])

  useEffect(() => {
    const coinjoinInProgress = serviceInfo && serviceInfo.coinjoinInProgress
    const makerRunning = serviceInfo && serviceInfo.makerRunning

    setCollaborativeOperationRunning(coinjoinInProgress || makerRunning)
  }, [serviceInfo])

  const getNewAddresses = (count, mixdepth) => {
    const externalBranch = walletInfo.data.display.walletinfo.accounts[mixdepth].branches.find((branch) => {
      return branch.branch.split('\t')[0] === 'external addresses'
    })

    const newAddresses = []

    externalBranch.entries.every((entry) => {
      if (entry.status === 'new') {
        newAddresses.push(entry.address)
      }

      if (newAddresses.length >= count) {
        return false
      }

      return true
    })

    return newAddresses
  }

  const startSchedule = async (values) => {
    if (collaborativeOperationRunning) {
      return
    }

    const destinations = [values.dest1, values.dest2, values.dest3]

    const body = { destination_addresses: destinations }

    // Todo: Testing toggle is deactivated until https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1260 is merged.
    // if (process.env.NODE_ENV === 'development' && useInsecureTestingSettings) {
    //   body.tumbler_options = {
    //     addrcount: 3,
    //     minmakercount: 1,
    //     makercountrange: [1, 1],
    //     mixdepthcount: 3,
    //     mintxcount: 2,
    //     txcountparams: [1, 1],
    //     timelambda: 0.1,
    //     stage1_timelambda_increase: 1.0,
    //     liquiditywait: 10,
    //     waittime: 1.0,
    //     mixdepthsrc: 0,
    //   }
    // }

    try {
      const res = await Api.postTumblerStart({ walletName: wallet.name, token: wallet.token }, body)

      if (!res.ok) {
        await Api.Helper.throwError(res, t('schedule.error_starting_schedule_failed'))
      }

      setCollaborativeOperationRunning(true)
    } catch (err) {
      setAlert({ variant: 'danger', message: err.message })
    }
  }

  const stopSchedule = async () => {
    if (!collaborativeOperationRunning) {
      return
    }

    try {
      const res = await Api.getTumblerStop({ walletName: wallet.name, token: wallet.token })

      if (!res.ok) {
        await Api.Helper.throwError(res, t('schedule.error_stopping_schedule_failed'))
      }

      setCollaborativeOperationRunning(false)
    } catch (err) {
      setAlert({ variant: 'danger', message: err.message })
    }
  }

  return (
    <>
      <PageTitle title={t('schedule.title')} subtitle={t('schedule.subtitle')} />
      <rb.Fade in={collaborativeOperationRunning} mountOnEnter={true} unmountOnExit={true}>
        <>
          {collaborativeOperationRunning && (
            <rb.Alert variant="info" className="mb-4">
              {t('send.text_coinjoin_already_running')}
            </rb.Alert>
          )}
        </>
      </rb.Fade>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {!collaborativeOperationRunning && (
        <>
          <div className="d-flex align-items-center justify-content-between mb-4">
            <div className="d-flex align-items-center gap-2">
              <Sprite symbol="checkmark" width="25" height="25" className="text-secondary" />
              <div className="d-flex flex-column">
                <div>{t('schedule.complete_wallet_title')}</div>
                <div className={`text-secondary ${styles['small-text']}`}>{t('schedule.complete_wallet_subtitle')}</div>
              </div>
            </div>
            {!wallet || !walletInfo || isLoading ? (
              <Balance loading={true} />
            ) : (
              // Todo: Subtract frozen or locked UTXOs from amount shown.
              <Balance
                valueString={walletInfo.data.display.walletinfo.total_balance}
                convertToUnit={settings.unit}
                showBalance={settings.showBalance}
              />
            )}
          </div>
          <p className="text-secondary mb-4">{t('schedule.description_destination_addresses')}</p>
        </>
      )}
      <Formik
        initialValues={{ dest1: '', dest2: '', dest3: '' }}
        validate={(values) => {
          if (collaborativeOperationRunning) {
            return {}
          }

          const errors = {}

          const isValidAddress = (candidate) => {
            return typeof candidate !== 'undefined' && candidate !== ''
          }

          if (!isValidAddress(values.dest1)) {
            errors.dest1 = t('schedule.error_invalid_destionation_address')
          }
          if (!isValidAddress(values.dest2)) {
            errors.dest2 = t('schedule.error_invalid_destionation_address')
          }
          if (!isValidAddress(values.dest3)) {
            errors.dest3 = t('schedule.error_invalid_destionation_address')
          }

          return errors
        }}
        onSubmit={async (values) => {
          if (collaborativeOperationRunning) {
            await stopSchedule()
          } else {
            await startSchedule(values)
          }
        }}
      >
        {({
          values,
          isSubmitting,
          handleSubmit,
          handleBlur,
          handleChange,
          setFieldValue,
          isValid,
          dirty,
          touched,
          errors,
        }) => (
          <rb.Form onSubmit={handleSubmit} noValidate>
            {!collaborativeOperationRunning && (
              <>
                <rb.Form.Group className="mb-4" controlId="offertype">
                  <ToggleSwitch
                    label={t('schedule.toggle_internal_destination_title')}
                    subtitle={t('schedule.toggle_internal_destination_title', { account: INTERNAL_DEST_ACCOUNT })}
                    initialValue={destinationIsInternal}
                    onToggle={async (isToggled) => {
                      setDestinationIsInternal(isToggled)

                      if (isToggled) {
                        const newAddresses = getNewAddresses(3, INTERNAL_DEST_ACCOUNT)
                        await setFieldValue('dest1', newAddresses[0], true)
                        await setFieldValue('dest2', newAddresses[1], true)
                        await setFieldValue('dest3', newAddresses[2], true)
                      } else {
                        await setFieldValue('dest1', '', false)
                        await setFieldValue('dest2', '', false)
                        await setFieldValue('dest3', '', false)
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </rb.Form.Group>
                {/* Todo: Testing toggle is deactivated until https://github.com/JoinMarket-Org/joinmarket-clientserver/pull/1260 is merged. */}
                {/*process.env.NODE_ENV === 'development' && (
                  <rb.Form.Group className="mb-4" controlId="offertype">
                    <ToggleSwitch
                      label={'Use insecure testing settings'}
                      subtitle={
                        "This is completely insecure but makes testing the schedule much faster. This option won't be available in production."
                      }
                      initialValue={useInsecureTestingSettings}
                      onToggle={(isToggled) => setUseInsecureTestingSettings(isToggled)}
                      disabled={isSubmitting}
                    />
                  </rb.Form.Group>
                )*/}
              </>
            )}
            {!collaborativeOperationRunning &&
              !destinationIsInternal &&
              [1, 2, 3].map((i) => {
                return (
                  <rb.Form.Group className="mb-4" key={i} controlId={`dest${i}`}>
                    <rb.Form.Label>{t('schedule.label_destination_input', { destination: i })}</rb.Form.Label>
                    {!wallet || !walletInfo || isLoading ? (
                      <rb.Placeholder as="div" animation="wave">
                        <rb.Placeholder xs={12} className={styles['input-loader']} />
                      </rb.Placeholder>
                    ) : (
                      <rb.Form.Control
                        name={`dest${i}`}
                        value={values[`dest${i}`]}
                        placeholder={t('schedule.placeholder_destination_input')}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        isInvalid={touched[`dest${i}`] && !!errors[`dest${i}`]}
                        className={`${styles.input} slashed-zeroes`}
                      />
                    )}
                  </rb.Form.Group>
                )
              })}
            <rb.Button
              className={styles.submit}
              variant="dark"
              type="submit"
              disabled={!collaborativeOperationRunning && (isSubmitting || !isValid || !dirty)}
            >
              <div className="d-flex justify-content-center align-items-center">
                {collaborativeOperationRunning ? t('schedule.button_stop') : t('schedule.button_start')}
              </div>
            </rb.Button>
          </rb.Form>
        )}
      </Formik>
    </>
  )
}
