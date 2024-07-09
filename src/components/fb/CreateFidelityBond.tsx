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
import { SelectJar, SelectUtxos, SelectDate } from './FidelityBondSteps'
import * as fb from './utils'
import { isDebugFeatureEnabled } from '../../constants/debugFeatures'
import styles from './CreateFidelityBond.module.css'
// import { PaymentConfirmModal } from '../PaymentConfirmModal'
// import { useFeeConfigValues } from '../../hooks/Fees'
import { jarName } from '../jars/Jar'

const TIMEOUT_RELOAD_UTXOS_AFTER_FB_CREATE_MS = 2_500

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

const CreateFidelityBond = ({ otherFidelityBondExists, wallet, walletInfo, onDone }: CreateFidelityBondProps) => {
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  // const feeConfigValues = useFeeConfigValues()[0]

  const [showCreateFidelityBondModal, setShowCreateFidelityBondModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [alert, setAlert] = useState<SimpleAlert>()
  const [step, setStep] = useState(steps.selectDate)
  // const [showConfirmInputsModal, setShowConfirmInputsModal] = useState(false)

  const [lockDate, setLockDate] = useState<Api.Lockdate | null>(null)
  const [selectedJar, setSelectedJar] = useState<JarIndex>()
  const [utxosOfSelectedJar, setUtxosOfSelectedJar] = useState<Utxos>([])
  const [selectedUtxos, setSelectedUtxos] = useState<Utxos>([])
  const [timelockedAddress, setTimelockedAddress] = useState<Api.BitcoinAddress>()
  const [utxoIdsToBeSpent, setUtxoIdsToBeSpent] = useState([])
  // const [createdFidelityBondUtxo, setCreatedFidelityBondUtxo] = useState<Utxo>()
  // const [frozenUtxos, setFrozenUtxos] = useState<Utxos>([])

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
    // setCreatedFidelityBondUtxo(undefined)
    // setFrozenUtxos([])
    setUtxoIdsToBeSpent([])
  }

  const currentWalletInfo = useCurrentWalletInfo()
  const fidelityBonds = useMemo(() => {
    return currentWalletInfo?.fidelityBondSummary.fbOutputs || []
  }, [currentWalletInfo])

  const bondWithSelectedLockDateAlreadyExists = useMemo(() => {
    return lockDate && fidelityBonds.some((it) => fb.utxo.getLocktime(it) === fb.lockdate.toTimestamp(lockDate))
  }, [fidelityBonds, lockDate])

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

  // const freezeUtxos = (utxos: Utxos) => {
  //   changeUtxoFreeze(utxos, true)
  // }

  // const unfreezeUtxos = (utxos: Utxos) => {
  //   changeUtxoFreeze(utxos, false)
  // }

  // const changeUtxoFreeze = (utxos: Utxos, freeze: boolean) => {
  //   setIsLoading(true)

  //   const abortCtrl = new AbortController()

  //   let utxosThatWereFrozen: Utxos = []

  //   const freezeCalls = utxos.map((utxo) =>
  //     Api.postFreeze({ ...wallet }, { utxo: utxo.utxo, freeze: freeze }).then((res) => {
  //       if (res.ok) {
  //         if (!utxo.frozen && freeze) {
  //           utxosThatWereFrozen.push(utxo)
  //         }
  //       } else {
  //         return Api.Helper.throwError(
  //           res,
  //           freeze ? t('earn.fidelity_bond.error_freezing_utxos') : t('earn.fidelity_bond.error_unfreezing_utxos'),
  //         )
  //       }
  //     }),
  //   )

  //   Promise.all(freezeCalls)
  //     .then((_) => reloadCurrentWalletInfo.reloadUtxos({ signal: abortCtrl.signal }))
  //     .then(() => setAlert(undefined))
  //     .then(() => freeze && setFrozenUtxos([...frozenUtxos, ...utxosThatWereFrozen]))
  //     .catch((err) => {
  //       setAlert({ variant: 'danger', message: err.message, dismissible: true })
  //     })
  //     .finally(() => {
  //       setIsLoading(false)
  //     })
  // }

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

  // const directSweepToFidelityBond = (jarIndex: JarIndex, address: Api.BitcoinAddress) => {
  //   setIsLoading(true)

  //   Api.postDirectSend(wallet, {
  //     mixdepth: jarIndex,
  //     destination: address,
  //     amount_sats: 0, // sweep
  //   })
  //     .then((res) =>
  //       res.ok ? res.json() : Api.Helper.throwError(res, t('earn.fidelity_bond.error_creating_fidelity_bond')),
  //     )
  //     .then((body) => setUtxoIdsToBeSpent(body.txinfo.inputs.map((input: any) => input.outpoint)))
  //     .then((_) => setAlert(undefined))
  //     .catch((err) => {
  //       setIsLoading(false)
  //       setAlert({ variant: 'danger', message: err.message })
  //     })
  // }

  useEffect(() => {
    if (lockDate) loadTimeLockedAddress(lockDate!)
  }, [lockDate, loadTimeLockedAddress])

  useEffect(() => {
    if (utxoIdsToBeSpent.length === 0) return

    const abortCtrl = new AbortController()

    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return

      reloadCurrentWalletInfo
        .reloadUtxos({ signal: abortCtrl.signal })
        .then((res) => {
          if (abortCtrl.signal.aborted) return

          const allUtxoIds = res.utxos.map((utxo) => utxo.utxo)
          const utxoIdsStillPresent = utxoIdsToBeSpent.filter((utxoId) => allUtxoIds.includes(utxoId))

          if (utxoIdsStillPresent.length === 0) {
            // Note that two fidelity bonds with the same locktime will end up on the same address.
            // Therefore, this might not actually be the UTXO we just created.
            // Since we're using it only for displaying locktime and address, this should be fine though.
            const fbOutputs = res.utxos.filter((utxo) => fb.utxo.isFidelityBond(utxo))
            const fbUtxo = fbOutputs.find((utxo) => utxo.address === timelockedAddress)

            if (fbUtxo !== undefined) {
              // setCreatedFidelityBondUtxo(fbUtxo)
            }

            setIsLoading(false)
          }

          setUtxoIdsToBeSpent([...utxoIdsStillPresent])
        })
        .catch((err) => {
          if (abortCtrl.signal.aborted) return

          setUtxoIdsToBeSpent([])
          setIsLoading(false)

          const message = t('global.errors.error_reloading_wallet_failed', {
            reason: err.message || t('global.errors.reason_unknown'),
          })
          setAlert({ variant: 'danger', message })
        })
    }, TIMEOUT_RELOAD_UTXOS_AFTER_FB_CREATE_MS)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [utxoIdsToBeSpent, reloadCurrentWalletInfo, timelockedAddress, t])

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
      default:
        return null
    }
  }

  const onlyCjOutOrFbUtxosSelected = () => {
    return selectedUtxos.every(
      (utxo) => walletInfo.addressSummary[utxo.address]?.status === 'cj-out' || utxo.locktime !== undefined,
    )
  }

  const secondaryButtonText = (currentStep: number) => {
    if (nextStep(step) === steps.done || nextStep(step) === steps.failed) {
      return null
    }

    switch (currentStep) {
      case steps.selectDate:
        return t('earn.fidelity_bond.select_date.text_secondary_button')
      case steps.selectJar:
        return t('earn.fidelity_bond.select_jar.text_secondary_button')
      case steps.selectUtxos:
        return t('earn.fidelity_bond.select_utxos.text_secondary_button')
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
      if (selectedUtxos.length > 0 && selectedUtxos.every((utxo) => !utxo.frozen)) {
        return steps.confirmation
      }
    }

    return null
  }

  const onPrimaryButtonClicked = () => {
    if (nextStep(step) === null) {
      return
    }

    if (nextStep(step) === steps.failed) {
      reset()
      return
    }

    if (nextStep(step) === steps.done) {
      reset()
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

  const stepTitle = (currentStep: Number) => {
    if (currentStep === steps.selectDate && lockDate !== null) {
      return (
        <span className={styles.subTitle}>{`- ${new Date(fb.lockdate.toTimestamp(lockDate)).toDateString()}`}</span>
      )
    }
    if (currentStep === steps.selectJar && selectedJar !== undefined) {
      return <span className={styles.subTitle}>{`- Jar ${jarName(selectedJar)}`}</span>
    }
  }

  useEffect(() => {
    console.log('all utxos:', utxosOfSelectedJar)
    console.log('selected', selectedUtxos)
  }, [selectedUtxos, utxosOfSelectedJar])

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
                  <div>{t('earn.fidelity_bond.error_loading_address')}</div>
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
                      <div className={styles.step}>{index + 1}</div>
                    </div>
                    {tab}
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
                      onChange={(date) => setLockDate(date)}
                    />
                    {bondWithSelectedLockDateAlreadyExists && (
                      <Alert
                        className="text-start mt-4"
                        variant="warning"
                        message={<Trans i18nKey="earn.fidelity_bond.select_date.warning_fb_with_same_expiry" />}
                      />
                    )}
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
                        setUtxosOfSelectedJar(walletInfo.utxosByJar[selectedJar!])
                        utxosOfSelectedJar.map((utxo) => ({ ...utxo, checked: false }))
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
                        setUtxosOfSelectedJar([...selectedUtxos, utxo])
                      }}
                      onUtxoDeselected={(utxo) => {
                        setSelectedUtxos(selectedUtxos.filter((it) => it !== utxo))
                        setUtxosOfSelectedJar([...selectedUtxos, utxo])
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
                {step === index && step === 3 && <div className="m-4"></div>}
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
                variant={'dark'}
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

export { CreateFidelityBond }
