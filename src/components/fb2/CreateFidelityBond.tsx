import { useState, useEffect, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import * as Api from '../../libs/JmWalletApi'
import { Trans, useTranslation } from 'react-i18next'
import {
  CurrentWallet,
  Utxos,
  WalletInfo,
  useCurrentWalletInfo,
  useReloadCurrentWalletInfo,
} from '../../context/WalletContext'
import Alert from '../Alert'
import Sprite from '../Sprite'
import { SelectJar, SelectUtxos, SelectDate, Confirmation } from './FidelityBondSteps'
import * as fb from './utils'
import { isDebugFeatureEnabled } from '../../constants/debugFeatures'
import styles from './CreateFidelityBond.module.css'
import { jarName } from '../jars/Jar'
import { spendUtxosWithDirectSend, errorResolver } from './SpendFidelityBondModal'
import Balance from '../Balance'
import { useSettings } from '../../context/SettingsContext'

export const LockInfoAlert = ({ lockDate, className }: { lockDate: Api.Lockdate; className?: string }) => {
  const { t, i18n } = useTranslation()

  return (
    <Alert
      className={className}
      variant="warning"
      message={
        <>
          {t('earn.fidelity_bond.confirm_modal.body', {
            date: new Date(fb.lockdate.toTimestamp(lockDate)).toUTCString(),
            humanReadableDuration: fb.time.humanReadableDuration({
              to: fb.lockdate.toTimestamp(lockDate),
              locale: i18n.resolvedLanguage || i18n.language,
            }),
          })}
        </>
      }
    />
  )
}

const steps = {
  selectDate: 0,
  selectJar: 1,
  selectUtxos: 2,
  confirmation: 3,
  done: 4,
  failed: 5,
}

interface CreateFidelityBondProps {
  otherFidelityBondExists: boolean
  wallet: CurrentWallet
  walletInfo: WalletInfo
  onDone: () => void
}

const CreateFidelityBond2 = ({ otherFidelityBondExists, wallet, walletInfo, onDone }: CreateFidelityBondProps) => {
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const [showCreateFidelityBondModal, setShowCreateFidelityBondModal] = useState(false)
  const [creatingFidelityBond, setCreatingFidelityBond] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [alert, setAlert] = useState<SimpleAlert>()
  const [step, setStep] = useState(steps.selectDate)
  const [lockDate, setLockDate] = useState<Api.Lockdate | null>(null)
  const [selectedJar, setSelectedJar] = useState<JarIndex>()
  const [selectedUtxos, setSelectedUtxos] = useState<Utxos>([])
  const [timelockedAddress, setTimelockedAddress] = useState<Api.BitcoinAddress>()

  // Check if all utxos are selected
  const selectedUtxosTotalValue = useMemo(
    () => selectedUtxos.map((it) => it.value).reduce((prev, curr) => prev + curr, 0),
    [selectedUtxos],
  )
  const allUtxosSelected = useMemo(
    () => walletInfo.balanceSummary.calculatedTotalBalanceInSats === selectedUtxosTotalValue,
    [walletInfo, selectedUtxosTotalValue],
  )

  const yearsRange = useMemo(() => {
    if (isDebugFeatureEnabled('allowCreatingExpiredFidelityBond')) {
      return fb.toYearsRange(-1, fb.DEFAULT_MAX_TIMELOCK_YEARS)
    }
    return fb.toYearsRange(0, fb.DEFAULT_MAX_TIMELOCK_YEARS)
  }, [])

  const reset = () => {
    setIsLoading(false)
    setShowCreateFidelityBondModal(false)
    setStep(steps.selectDate)
    setSelectedJar(undefined)
    setSelectedUtxos([])
    setLockDate(null)
    setTimelockedAddress(undefined)
    setAlert(undefined)
  }

  // fidelity Bonds data
  const currentWalletInfo = useCurrentWalletInfo()
  const fidelityBonds = useMemo(() => {
    return currentWalletInfo?.fidelityBondSummary.fbOutputs || []
  }, [currentWalletInfo])

  // Check if bond with selected lockDate already exists
  const bondWithSelectedLockDateAlreadyExists = useMemo(() => {
    return lockDate && fidelityBonds.some((it) => fb.utxo.getLocktime(it) === fb.lockdate.toTimestamp(lockDate))
  }, [fidelityBonds, lockDate])

  const onlyCjOutOrFbUtxosSelected = () => {
    return selectedUtxos.every(
      (utxo) => walletInfo.addressSummary[utxo.address]?.status === 'cj-out' || utxo.locktime !== undefined,
    )
  }

  useEffect(() => {
    if (!showCreateFidelityBondModal) {
      reset()
    } else {
      setIsLoading(true)
      const abortCtrl = new AbortController()
      reloadCurrentWalletInfo
        .reloadAll({ signal: abortCtrl.signal })
        .catch(() => {
          if (abortCtrl.signal.aborted) return
          setAlert({ variant: 'danger', message: t('earn.fidelity_bond.error_reloading_wallet') })
        })
        .finally(() => {
          if (abortCtrl.signal.aborted) return
          setIsLoading(false)
        })
      return () => abortCtrl.abort()
    }
  }, [showCreateFidelityBondModal, reloadCurrentWalletInfo, t])

  const loadTimeLockedAddress = useCallback(
    (lockDate: Api.Lockdate) => {
      const abortCtrl = new AbortController()

      Api.getAddressTimelockNew({
        ...wallet,
        signal: abortCtrl.signal,
        lockdate: lockDate,
      })
        .then((res) => {
          return res.ok ? res.json() : Api.Helper.throwError(res, t('earn.fidelity_bond.error_loading_address'))
        })
        .then((data) => setTimelockedAddress(data.address))
        .then((_) => setAlert(undefined))
        .catch((err) => {
          setAlert({ variant: 'danger', message: err.message })
        })
    },
    [t, wallet],
  )

  useEffect(() => {
    if (lockDate) loadTimeLockedAddress(lockDate)
  }, [lockDate, loadTimeLockedAddress])

  const [countdown, setCountdown] = useState(5)
  const [isClickable, setIsClickable] = useState(false)

  const startCountdown = () => {
    const interval = setInterval(() => {
      console.log(countdown)
      setCountdown((prevCountdown) => {
        if (prevCountdown <= 1) {
          clearInterval(interval)
          setIsClickable(true)
          return 0
        }
        return prevCountdown - 1
      })
    }, 1000)
  }

  const primaryButtonText = (currentStep: number) => {
    switch (currentStep) {
      case steps.selectDate:
        return t('earn.fidelity_bond.select_date.text_primary_button')
      case steps.selectJar:
        return t('earn.fidelity_bond.select_jar.text_primary_button')
      case steps.selectUtxos:
        if (!onlyCjOutOrFbUtxosSelected()) {
          return t('earn.fidelity_bond.select_utxos.text_primary_button_unsafe')
        }
        return t('earn.fidelity_bond.select_utxos.text_primary_button')
      case steps.confirmation:
        if (isClickable) return t('earn.fidelity_bond.confirmation.text_primary_button')
        else return `Wait ${countdown} Seconds`
      default:
        return null
    }
  }

  const secondaryButtonText = (currentStep: number) => {
    if (nextStep(step) === steps.failed) {
      return null
    }

    switch (currentStep) {
      case steps.selectDate:
        return t('earn.fidelity_bond.select_date.text_secondary_button')
      case steps.selectJar:
        return t('earn.fidelity_bond.select_jar.text_secondary_button')
      case steps.selectUtxos:
        return t('earn.fidelity_bond.select_utxos.text_secondary_button')
      case steps.confirmation:
        return t('earn.fidelity_bond.confirmation.text_secondary_button')
      default:
        return null
    }
  }

  const nextStep = (currentStep: number) => {
    if (currentStep === steps.selectDate) {
      if (lockDate !== null) {
        return steps.selectJar
      }
    }

    if (currentStep === steps.selectJar) {
      if (selectedJar !== undefined) {
        return steps.selectUtxos
      }
    }

    if (currentStep === steps.selectUtxos) {
      if (selectedUtxos.length > 0) {
        return steps.confirmation
      }
    }

    if (currentStep === steps.confirmation) {
      if (isClickable) {
        if (alert) {
          return steps.failed
        }
        return steps.done
      }
    }

    return null
  }

  const onPrimaryButtonClicked = async () => {
    if (nextStep(step) === null) {
      return
    }

    if (nextStep(step) === steps.confirmation) {
      setIsClickable(false)
      setCountdown(5)
      startCountdown()
    }

    if (nextStep(step) === steps.failed) {
      reset()
      return
    }

    if (nextStep(step) === steps.done) {
      const abortCtrl = new AbortController()
      const requestContext = { ...wallet, signal: abortCtrl.signal }
      reset()
      setCreatingFidelityBond(true)
      await spendUtxosWithDirectSend(
        requestContext,
        {
          destination: timelockedAddress!,
          sourceJarIndex: selectedJar!,
          utxos: selectedUtxos,
        },
        {
          onReloadWalletError: (res) =>
            Api.Helper.throwResolved(res, errorResolver(t, 'global.errors.error_reloading_wallet_failed')),
          onFreezeUtxosError: (res) =>
            Api.Helper.throwResolved(res, errorResolver(t, 'earn.fidelity_bond.move.error_freezing_utxos')),
          onUnfreezeUtxosError: (res) =>
            Api.Helper.throwResolved(res, errorResolver(t, 'earn.fidelity_bond.move.error_unfreezing_fidelity_bond')),
          onSendError: (res) =>
            Api.Helper.throwResolved(res, errorResolver(t, 'earn.fidelity_bond.move.error_spending_fidelity_bond')),
        },
      )
      setCreatingFidelityBond(false)
      onDone()
      return
    }

    const next = nextStep(step)
    if (next !== null) {
      setStep(next)
    } else {
      reset()
      setStep(0)
    }
  }

  const onSecondaryButtonClicked = () => {
    if (step !== steps.selectDate) {
      setStep(step - 1)
    }
  }

  const settings = useSettings()

  const stepTitle = (currentStep: Number) => {
    if (currentStep === steps.selectDate && lockDate !== null) {
      return (
        <span className={styles.subTitle}>{`- ${new Date(fb.lockdate.toTimestamp(lockDate)).toDateString()}`}</span>
      )
    }
    if (currentStep === steps.selectJar && selectedJar !== undefined) {
      return <span className={styles.subTitle}>{`- Jar ${jarName(selectedJar)}`}</span>
    }
    if (currentStep === steps.selectUtxos && selectedUtxos.length !== 0) {
      return (
        <span className={styles.subTitle}>
          {'- '}
          <Balance
            valueString={selectedUtxos.reduce((acc, utxo) => acc + utxo.value, 0).toString()}
            convertToUnit={settings.unit}
            showBalance={true}
            colored={false}
          />
        </span>
      )
    }
  }

  return (
    <div>
      {otherFidelityBondExists ? (
        <div className="d-flex justify-content-center">
          <rb.Button
            size="sm"
            variant="outline-dark"
            className="border-0 d-inline-flex align-items-center"
            onClick={() => setShowCreateFidelityBondModal(!showCreateFidelityBondModal)}
          >
            <Sprite symbol="plus" width="20" height="20" className="me-2" />
            {t('earn.fidelity_bond.title_fidelity_bond_exists')}
          </rb.Button>
        </div>
      ) : (
        <div className={styles.container}>
          <div className={styles.header} onClick={() => setShowCreateFidelityBondModal(!showCreateFidelityBondModal)}>
            <div className="d-flex justify-content-between align-items-center">
              <div className={styles.title}>{t('earn.fidelity_bond.title')}</div>
              <Sprite symbol={'plus'} width="20" height="20" />
            </div>
            <div className={styles.subtitle}>
              <div className="d-flex align-items-center justify-content-center gap-4 px-3 mt-3">
                <Sprite className={styles.subtitleJar} symbol="fb-clock" width="46px" height="74px" />
                {t('earn.fidelity_bond.subtitle')}
              </div>
            </div>
          </div>
        </div>
      )}
      {
        <rb.Modal
          show={creatingFidelityBond}
          animation={true}
          backdrop="static"
          centered={true}
          keyboard={false}
          onHide={() => setCreatingFidelityBond(false)}
        >
          <rb.Modal.Header closeButton>
            <rb.Modal.Title>{t('earn.fidelity_bond.create_fidelity_bond.title')}</rb.Modal.Title>
          </rb.Modal.Header>
          <rb.Modal.Body>
            <div className="d-flex justify-content-center align-items-center mt-5">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              <div>{t('earn.fidelity_bond.text_creating')}</div>
            </div>
          </rb.Modal.Body>
        </rb.Modal>
      }
      <rb.Modal
        show={showCreateFidelityBondModal}
        animation={true}
        backdrop="static"
        centered={true}
        keyboard={false}
        onHide={() => setShowCreateFidelityBondModal(false)}
      >
        <rb.Modal.Header closeButton>
          <rb.Modal.Title>{t('earn.fidelity_bond.create_fidelity_bond.title')}</rb.Modal.Title>
        </rb.Modal.Header>
        <rb.Modal.Body>
          {alert && <Alert {...alert} className="mt-0" onClose={() => setAlert(undefined)} />}
          {bondWithSelectedLockDateAlreadyExists && (
            <Alert
              className="text-start mt-2"
              variant="warning"
              message={<Trans i18nKey="earn.fidelity_bond.select_date.warning_fb_with_same_expiry" />}
            />
          )}
          {otherFidelityBondExists && (
            <div className={styles.formMessageWhenBondAlreadyExists}>
              <Trans i18nKey="earn.fidelity_bond.subtitle_fidelity_bond_exists">
                <a
                  onClick={(e) => e.stopPropagation()}
                  rel="noopener noreferrer"
                  href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md#what-amount-of-bitcoins-to-lock-up-and-for-how-long"
                >
                  {/* i18n placeholder */}
                </a>
              </Trans>
            </div>
          )}

          <div className="d-flex align-items-center gap-4 mx-4 my-3 justify-content-start">
            <div>
              <Sprite symbol="timelock" width="25" height="25" className={styles.utxoSummaryIconLock} />
            </div>
            <div className="d-flex flex-column">
              <div className={styles.addressLabel}>{t('earn.fidelity_bond.review_inputs.label_address')}</div>
              <div className={styles.addressContent}>
                {timelockedAddress ? (
                  <code className={styles.timelockedAddress}>{timelockedAddress}</code>
                ) : (
                  <div>
                    <rb.Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.tabs}>
            {['Expiration date', 'Funding Source', 'UTXO Overview', 'Confirmation'].map((tab, index) => (
              <div>
                <div key={index} className={styles.tab}>
                  <div className="d-flex align-items-center gap-4">
                    <div className={styles.circle}>
                      <div className={styles.step}>
                        {index === 3 ? <Sprite symbol="checkmark" width="20" height="20" /> : index + 1}
                      </div>
                    </div>
                    <div className={styles.stepHeader}>{tab}</div>
                    {stepTitle(index)}
                  </div>
                  <Sprite symbol={step === index ? 'caret-up' : 'caret-down'} width="20" height="20" />
                </div>

                {index === 0 && isLoading && (
                  <div className="d-flex justify-content-center align-items-center m-5">
                    <rb.Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    <div>{t('earn.fidelity_bond.text_loading')}</div>
                  </div>
                )}

                {!isLoading && step === index && step === 0 && (
                  <div className="m-4">
                    <SelectDate
                      description={t('earn.fidelity_bond.select_date.description')}
                      yearsRange={yearsRange}
                      lockdate={lockDate}
                      onChange={(date) => setLockDate(date)}
                    />
                  </div>
                )}

                {step === index && step === 1 && (
                  <div className="m-4">
                    <SelectJar
                      description={t('earn.fidelity_bond.select_jar.description')}
                      accountBalances={walletInfo.balanceSummary.accountBalances}
                      totalBalance={walletInfo.balanceSummary.calculatedTotalBalanceInSats}
                      isJarSelectable={(jarIndex) =>
                        walletInfo.utxosByJar[jarIndex] && walletInfo.utxosByJar[jarIndex].length > 0
                      }
                      selectedJar={selectedJar}
                      onJarSelected={(accountIndex) => {
                        setSelectedJar(accountIndex)
                        setSelectedUtxos([])
                      }}
                    />
                  </div>
                )}
                {step === index && step === 2 && (
                  <div className="m-4">
                    <SelectUtxos
                      walletInfo={walletInfo}
                      jar={selectedJar!}
                      utxos={walletInfo.utxosByJar[selectedJar!]}
                      selectedUtxos={selectedUtxos}
                      onUtxoSelected={(utxo) => {
                        setSelectedUtxos([...selectedUtxos, utxo])
                      }}
                      onUtxoDeselected={(utxo) => {
                        setSelectedUtxos(selectedUtxos.filter((it) => it.utxo !== utxo.utxo))
                      }}
                    />
                    {allUtxosSelected && (
                      <Alert
                        variant="warning"
                        message={<Trans i18nKey="earn.fidelity_bond.alert_all_funds_in_use" />}
                      />
                    )}
                  </div>
                )}
                {step === index && step === 3 && (
                  <div className="m-4">
                    <Confirmation
                      lockDate={lockDate!}
                      jar={selectedJar!}
                      selectedUtxos={selectedUtxos}
                      timelockedAddress={timelockedAddress!}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </rb.Modal.Body>
        <rb.Modal.Footer>
          <div className="d-flex flex-row gap-2 w-100">
            {!isLoading && secondaryButtonText(step) !== null && (
              <rb.Button className="w-100" variant="none" onClick={onSecondaryButtonClicked}>
                {secondaryButtonText(step)}
              </rb.Button>
            )}
            {!isLoading && primaryButtonText(step) !== null && (
              <rb.Button
                className="w-100"
                variant={nextStep(step) === steps.confirmation && !onlyCjOutOrFbUtxosSelected() ? 'danger' : 'dark'}
                disabled={nextStep(step) === null}
                type="submit"
                onClick={onPrimaryButtonClicked}
              >
                {primaryButtonText(step)}
              </rb.Button>
            )}
          </div>
        </rb.Modal.Footer>
      </rb.Modal>
    </div>
  )
}

export { CreateFidelityBond2 }
