import { useState, useEffect, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import * as Api from '../../libs/JmWalletApi'
import { Trans, useTranslation } from 'react-i18next'
import { useReloadCurrentWalletInfo } from '../../context/WalletContext'
import Alert from '../Alert'
import Sprite from '../Sprite'
import { ConfirmModal } from '../Modal'
import {
  SelectJar,
  SelectUtxos,
  SelectDate,
  FreezeUtxos,
  ReviewInputs,
  CreatedFidelityBond,
  Done,
} from './FidelityBondSteps'
import * as fb from './utils'
import { isDebugFeatureEnabled } from '../../constants/debugFeatures'
import styles from './CreateFidelityBond.module.css'

const TIMEOUT_RELOAD_UTXOS_AFTER_FB_CREATE_MS = 2500

const steps = {
  selectDate: 0,
  selectJar: 1,
  selectUtxos: 2,
  freezeUtxos: 3,
  reviewInputs: 4,
  createFidelityBond: 5,
  unfreezeUtxos: 6,
  done: 7,
  failed: 8,
}

const CreateFidelityBond = ({ otherFidelityBondExists, wallet, walletInfo, onDone }) => {
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const { t, i18n } = useTranslation()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [alert, setAlert] = useState(null)
  const [step, setStep] = useState(steps.selectDate)
  const [showConfirmInputsModal, setShowConfirmInputsModal] = useState(false)

  const utxosByJar = useMemo(() => {
    const utxos = walletInfo.data.utxos.utxos

    return utxos.reduce((res, utxo) => {
      const { mixdepth } = utxo
      res[mixdepth] = res[mixdepth] || []
      res[mixdepth].push(utxo)

      return res
    }, {})
  }, [walletInfo])

  const [lockDate, setLockDate] = useState(null)
  const [selectedJar, setSelectedJar] = useState(null)
  const [selectedUtxos, setSelectedUtxos] = useState([])
  const [timelockedAddress, setTimelockedAddress] = useState(null)
  const [utxoIdsToBeSpent, setUtxoIdsToBeSpent] = useState([])
  const [createdFidelityBondUtxo, setCreatedFidelityBondUtxo] = useState(null)
  const [frozenUtxos, setFrozenUtxos] = useState([])

  const yearsRange = useMemo(() => {
    if (isDebugFeatureEnabled('allowCreatingExpiredFidelityBond')) {
      return fb.toYearsRange(-1, fb.DEFAULT_MAX_TIMELOCK_YEARS)
    }
    return fb.toYearsRange(0, fb.DEFAULT_MAX_TIMELOCK_YEARS)
  }, [])

  const reset = () => {
    setIsExpanded(false)
    setStep(steps.selectDate)
    setSelectedJar(null)
    setSelectedUtxos([])
    setLockDate(null)
    setTimelockedAddress(null)
    setAlert(null)
    setCreatedFidelityBondUtxo(null)
    setFrozenUtxos([])
    setUtxoIdsToBeSpent([])
  }

  const freezeUtxos = (utxos) => {
    changeUtxoFreeze(utxos, true)
  }

  const unfreezeUtxos = (utxos) => {
    changeUtxoFreeze(utxos, false)
  }

  const changeUtxoFreeze = (utxos, freeze) => {
    setIsLoading(true)

    const abortCtrl = new AbortController()

    let utxosThatWereFrozen = []

    const { name: walletName, token } = wallet
    const freezeCalls = utxos.map((utxo) =>
      Api.postFreeze({ walletName, token }, { utxo: utxo.utxo, freeze: freeze }).then((res) => {
        if (res.ok) {
          if (!utxo.frozen && freeze) {
            utxosThatWereFrozen.push(utxo)
          }
        } else {
          return Api.Helper.throwError(
            res,
            freeze ? t('earn.fidelity_bond.error_freezing_utxos') : t('earn.fidelity_bond.error_unfreezing_utxos')
          )
        }
      })
    )

    Promise.all(freezeCalls)
      .then((_) => reloadCurrentWalletInfo({ signal: abortCtrl.signal }))
      .then((_) => setAlert(null))
      .then((_) => freeze && setFrozenUtxos([...frozenUtxos, ...utxosThatWereFrozen]))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const loadTimeLockedAddress = (lockDate) => {
    setIsLoading(true)

    const abortCtrl = new AbortController()

    Api.getAddressTimelockNew({
      walletName: wallet.name,
      token: wallet.token,
      signal: abortCtrl.signal,
      lockdate: lockDate,
    })
      .then((res) => {
        return res.ok ? res.json() : Api.Helper.throwError(res, t('earn.fidelity_bond.error_loading_address'))
      })
      .then((data) => setTimelockedAddress(data.address))
      .then((_) => setAlert(null))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => setIsLoading(false))
  }

  const directSweepToFidelityBond = (jar, address) => {
    setIsLoading(true)

    Api.postDirectSend(
      { walletName: wallet.name, token: wallet.token },
      {
        mixdepth: jar,
        destination: address,
        amount_sats: 0, // sweep
      }
    )
      .then((res) =>
        res.ok ? res.json() : Api.Helper.throwError(res, t('earn.fidelity_bond.error_creating_fidelity_bond'))
      )
      .then((body) => setUtxoIdsToBeSpent(body.txinfo.inputs.map((input) => input.outpoint)))
      .then((_) => setAlert(null))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message })
      })
  }

  useEffect(() => {
    if (utxoIdsToBeSpent.length === 0) return

    const abortCtrl = new AbortController()

    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return

      reloadCurrentWalletInfo({ signal: abortCtrl.signal })
        .then((walletInfo) => {
          if (abortCtrl.signal.aborted) return

          const allUtxoIds = walletInfo.data.utxos.utxos.map((utxo) => utxo.utxo)
          const utxoIdsStillPresent = utxoIdsToBeSpent.filter((utxoId) => allUtxoIds.includes(utxoId))

          if (utxoIdsStillPresent.length === 0) {
            // Note that two fidelity bonds with the same locktime will end up on the same address.
            // Therefore, this might not actually be the UTXO we just created.
            // Since we're using it only for displaying locktime and address, this should be fine though.
            const fbUtxo = walletInfo.fidelityBondSummary.fbOutputs.find((utxo) => utxo.address === timelockedAddress)

            if (fbUtxo !== undefined) {
              setCreatedFidelityBondUtxo(fbUtxo)
            }

            setIsLoading(false)
          }

          setUtxoIdsToBeSpent([...utxoIdsStillPresent])
        })
        .catch((err) => {
          if (abortCtrl.signal.aborted) return

          setUtxoIdsToBeSpent([])
          setIsLoading(false)

          setAlert({ variant: 'danger', message: t('earn.fidelity_bond.error_reloading_wallet') })
        })
    }, TIMEOUT_RELOAD_UTXOS_AFTER_FB_CREATE_MS)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [utxoIdsToBeSpent, reloadCurrentWalletInfo, timelockedAddress, t])

  const stepComponent = (currentStep) => {
    switch (currentStep) {
      case steps.selectDate:
        return (
          <SelectDate
            description={t('earn.fidelity_bond.select_date.description')}
            selectableYearsRange={yearsRange}
            onDateSelected={(date) => setLockDate(date)}
          />
        )
      case steps.selectJar:
        return (
          <SelectJar
            description={t('earn.fidelity_bond.select_jar.description')}
            accountBalances={walletInfo.balanceSummary.accountBalances}
            totalBalance={walletInfo.balanceSummary.totalBalance}
            isJarSelectable={(jarIndex) => utxosByJar[jarIndex] && utxosByJar[jarIndex].length > 0}
            selectedJar={selectedJar}
            onJarSelected={(accountIndex) => setSelectedJar(accountIndex)}
          />
        )
      case steps.selectUtxos:
        return (
          <SelectUtxos
            walletInfo={walletInfo}
            jar={selectedJar}
            utxos={utxosByJar[selectedJar]}
            selectedUtxos={selectedUtxos}
            onUtxoSelected={(utxo) => setSelectedUtxos([...selectedUtxos, utxo])}
            onUtxoDeselected={(utxo) => setSelectedUtxos(selectedUtxos.filter((it) => it !== utxo))}
          />
        )
      case steps.freezeUtxos:
        return (
          <FreezeUtxos
            walletInfo={walletInfo}
            jar={selectedJar}
            utxos={utxosByJar[selectedJar]}
            selectedUtxos={selectedUtxos}
            isLoading={isLoading}
          />
        )
      case steps.reviewInputs:
        if (isLoading) {
          return (
            <div className="d-flex justify-content-center align-items-center mt-5">
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              <div>{t('earn.fidelity_bond.text_loading')}</div>
            </div>
          )
        }

        if (timelockedAddress === null) {
          return <div>{t('earn.fidelity_bond.error_loading_address')}</div>
        }

        return (
          <ReviewInputs
            lockDate={lockDate}
            jar={selectedJar}
            utxos={utxosByJar[selectedJar]}
            selectedUtxos={selectedUtxos}
            timelockedAddress={timelockedAddress}
          />
        )

      case steps.createFidelityBond:
        return isLoading ? (
          <div className="d-flex justify-content-center align-items-center mt-5">
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            <div>{t('earn.fidelity_bond.text_creating')}</div>
          </div>
        ) : (
          <div className="d-flex justify-content-center align-items-center gap-2 mt-5">
            {alert === null ? (
              <CreatedFidelityBond fbUtxo={createdFidelityBondUtxo} frozenUtxos={frozenUtxos} />
            ) : (
              <>{t('earn.fidelity_bond.error_creating_fidelity_bond')}</>
            )}
          </div>
        )
      case steps.unfreezeUtxos:
        return isLoading ? (
          <div className="d-flex justify-content-center align-items-center mt-5">
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            <div>{t('earn.fidelity_bond.text_unfreezing')}</div>
          </div>
        ) : (
          <div className="d-flex justify-content-center align-items-center gap-2 mt-5">
            {alert === null ? (
              <Done text={t('earn.fidelity_bond.unfreeze_utxos.done')} />
            ) : (
              <>{t('earn.fidelity_bond.error_unfreezing_utxos')}</>
            )}
          </div>
        )
      default:
        return null
    }
  }

  const primaryButtonText = (currentStep) => {
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
      case steps.freezeUtxos:
        const utxosAreFrozen = fb.utxo.allAreFrozen(fb.utxo.utxosToFreeze(utxosByJar[selectedJar], selectedUtxos))

        if (utxosAreFrozen) {
          return t('earn.fidelity_bond.freeze_utxos.text_primary_button_all_frozen')
        } else if (alert !== null) {
          return t('earn.fidelity_bond.freeze_utxos.text_primary_button_error')
        }

        return t('earn.fidelity_bond.freeze_utxos.text_primary_button')
      case steps.reviewInputs:
        if (timelockedAddress === null) return t('earn.fidelity_bond.review_inputs.text_primary_button_error')

        if (!onlyCjOutOrFbUtxosSelected()) {
          return t('earn.fidelity_bond.review_inputs.text_primary_button_unsafe')
        }

        return t('earn.fidelity_bond.review_inputs.text_primary_button')
      case steps.createFidelityBond:
        if (alert !== null) {
          return t('earn.fidelity_bond.create_fidelity_bond.text_primary_button_error')
        }

        if (frozenUtxos.length > 0) {
          return t('earn.fidelity_bond.create_fidelity_bond.text_primary_button_unfreeze')
        }

        return t('earn.fidelity_bond.create_fidelity_bond.text_primary_button')
      case steps.unfreezeUtxos:
        return t('earn.fidelity_bond.unfreeze_utxos.text_primary_button')
      default:
        return null
    }
  }

  const onlyCjOutOrFbUtxosSelected = () => {
    return selectedUtxos.every(
      (utxo) => walletInfo.addressSummary[utxo.address]?.status === 'cj-out' || utxo.locktime !== undefined
    )
  }

  const secondaryButtonText = (currentStep) => {
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
      case steps.freezeUtxos:
        return t('earn.fidelity_bond.freeze_utxos.text_secondary_button')
      case steps.reviewInputs:
        return t('earn.fidelity_bond.review_inputs.text_secondary_button')
      case steps.createFidelityBond:
        return frozenUtxos.length > 0 ? t('earn.fidelity_bond.create_fidelity_bond.text_secondary_button') : null
      default:
        return null
    }
  }

  const nextStep = (currentStep) => {
    if (currentStep === steps.selectDate) {
      if (lockDate !== null) {
        return steps.selectJar
      }
    }

    if (currentStep === steps.selectJar) {
      if (selectedJar !== null) {
        return steps.selectUtxos
      }
    }

    if (currentStep === steps.selectUtxos) {
      if (selectedUtxos.length > 0 && selectedUtxos.every((utxo) => !utxo.frozen)) {
        return steps.freezeUtxos
      }
    }

    if (currentStep === steps.freezeUtxos) {
      if (isLoading) {
        return null
      }

      const utxosAreFrozen = fb.utxo.allAreFrozen(fb.utxo.utxosToFreeze(utxosByJar[selectedJar], selectedUtxos))
      if (utxosAreFrozen) {
        return steps.reviewInputs
      }

      return steps.freezeUtxos
    }

    if (currentStep === steps.reviewInputs) {
      if (isLoading) {
        return null
      }

      return steps.createFidelityBond
    }

    if (currentStep === steps.createFidelityBond) {
      if (!isLoading && alert === null && frozenUtxos.length > 0) {
        return steps.unfreezeUtxos
      }

      if (alert !== null) {
        return steps.failed
      }

      return steps.done
    }

    if (currentStep === steps.unfreezeUtxos) {
      if (isLoading) {
        return null
      }

      return steps.done
    }

    return null
  }

  const onPrimaryButtonClicked = () => {
    if (nextStep(step) === null) {
      return
    }

    if (step === steps.freezeUtxos) {
      const utxosToFreeze = fb.utxo.utxosToFreeze(utxosByJar[selectedJar], selectedUtxos)
      const utxosAreFrozen = fb.utxo.allAreFrozen(utxosToFreeze)

      if (!utxosAreFrozen) {
        freezeUtxos(utxosToFreeze)
      }
    }

    if (nextStep(step) === steps.reviewInputs) {
      loadTimeLockedAddress(lockDate)
    }

    if (step === steps.reviewInputs && timelockedAddress === null) {
      loadTimeLockedAddress(lockDate)
      return
    }

    if (nextStep(step) === steps.createFidelityBond) {
      setShowConfirmInputsModal(true)
      return
    }

    if (nextStep(step) === steps.unfreezeUtxos) {
      unfreezeUtxos(frozenUtxos)
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

    setStep(nextStep(step))
  }

  const onSecondaryButtonClicked = () => {
    if (step === steps.createFidelityBond) {
      reset()
      onDone()
    } else {
      reset()
    }
  }

  return (
    <div className={styles.container}>
      {alert && <Alert {...alert} className="mt-0" onClose={() => setAlert(null)} />}
      {lockDate && (
        <ConfirmModal
          isShown={showConfirmInputsModal}
          title={t('earn.fidelity_bond.confirm_modal.title')}
          onCancel={() => setShowConfirmInputsModal(false)}
          onConfirm={() => {
            setStep(steps.createFidelityBond)
            setShowConfirmInputsModal(false)
            directSweepToFidelityBond(selectedJar, timelockedAddress)
          }}
        >
          {t('earn.fidelity_bond.confirm_modal.body', {
            date: new Date(lockDate).toUTCString(),
            humanReadableDuration: fb.time.humanReadableDuration({
              to: fb.lockdate.toTimestamp(lockDate),
              locale: i18n.resolvedLanguage || i18n.language,
            }),
          })}
        </ConfirmModal>
      )}
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div className="d-flex justify-content-between align-items-center">
          <div className={styles.title}>
            {otherFidelityBondExists
              ? t('earn.fidelity_bond.title_fidelity_bond_exists')
              : t('earn.fidelity_bond.title')}
          </div>
          <Sprite symbol={isExpanded ? 'caret-up' : 'plus'} width="20" height="20" />
        </div>
        <div className={styles.subtitle}>
          {otherFidelityBondExists ? (
            <Trans i18nKey="earn.fidelity_bond.subtitle_fidelity_bond_exists">
              <a
                onClick={(e) => e.stopPropagation()}
                rel="noopener noreferrer"
                href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md#what-amount-of-bitcoins-to-lock-up-and-for-how-long"
              >
                {/* i18n placeholder */}
              </a>
            </Trans>
          ) : (
            <div className="d-flex align-items-center justify-content-center gap-4 px-3 mt-3">
              <Sprite className={styles.subtitleJar} symbol="fb-clock" width="46px" height="74px" />
              {t('earn.fidelity_bond.subtitle')}
            </div>
          )}
        </div>
      </div>
      <rb.Collapse in={isExpanded}>
        <div>
          <hr />
          <div className="mb-5">{stepComponent(step)}</div>
          <div className={styles.buttons}>
            {!isLoading && primaryButtonText(step) !== null && (
              <rb.Button
                variant={
                  nextStep(step) === steps.createFidelityBond && !onlyCjOutOrFbUtxosSelected() ? 'danger' : 'dark'
                }
                disabled={nextStep(step) === null}
                type="submit"
                onClick={onPrimaryButtonClicked}
              >
                {primaryButtonText(step)}
              </rb.Button>
            )}
            {!isLoading && secondaryButtonText(step) !== null && (
              <rb.Button variant="white" type="submit" onClick={onSecondaryButtonClicked}>
                {secondaryButtonText(step)}
              </rb.Button>
            )}
          </div>
        </div>
      </rb.Collapse>
    </div>
  )
}

export { CreateFidelityBond }
