import React, { useState, useEffect, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import * as Api from '../../libs/JmWalletApi'
import { useReloadCurrentWalletInfo } from '../../context/WalletContext'
import Alert from '../Alert'
import Sprite from '../Sprite'
import { ConfirmModal } from '../Modal'
import { SelectJar, SelectUtxos, SelectDate, FreezeUtxos, ReviewInputs } from './FidelityBondSteps'
import * as fb from './utils'
import { isDebugFeatureEnabled } from '../../constants/debugFeatures'
import styles from './CreateFidelityBond.module.css'

const steps = {
  selectDate: 0,
  selectJar: 1,
  selectUtxos: 2,
  freezeUtxos: 3,
  reviewInputs: 4,
  createFidelityBond: 5,
  done: 6,
  failed: 7,
}

const CreateFidelityBond = ({ otherFidelityBondExists, accountBalances, totalBalance, wallet, walletInfo, onDone }) => {
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [alert, setAlert] = useState(null)
  const [step, setStep] = useState(steps.selectDate)
  const [showConfirmInputsModal, setShowConfirmInputsModal] = useState(false)

  const [utxos, setUtxos] = useState({})

  const [lockDate, setLockDate] = useState(null)
  const [selectedJar, setSelectedJar] = useState(null)
  const [selectedUtxos, setSelectedUtxos] = useState([])
  const [timelockedAddress, setTimelockedAddress] = useState(null)

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
  }

  const freezeUtxos = (utxos) => {
    setIsLoading(true)

    const abortCtrl = new AbortController()

    const { name: walletName, token } = wallet
    const freezeCalls = utxos.map((utxo) =>
      Api.postFreeze({ walletName, token }, { utxo: utxo.utxo, freeze: true }).then((res) => {
        if (!res.ok) {
          return Api.Helper.throwError(res, 'current_wallet_advanced.error_freeze_failed')
        }
      })
    )

    Promise.all(freezeCalls)
      .then((_) => reloadCurrentWalletInfo({ signal: abortCtrl.signal }))
      .then((_) => setAlert(null))
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
        return res.ok ? res.json() : Api.Helper.throwError(res, 'fidelity_bond.error_loading_timelock_address_failed')
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
      .then((res) => {
        if (!res.ok) {
          return Api.Helper.throwError(res, 'Could not create fidelity bond.')
        }
      })
      .then((_) => setAlert(null))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message })
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    const utxos = walletInfo.data.utxos.utxos

    const utxosByAccount = utxos.reduce((res, utxo) => {
      const { mixdepth } = utxo
      res[mixdepth] = res[mixdepth] || []
      res[mixdepth].push(utxo)

      return res
    }, {})

    setUtxos(utxosByAccount)
  }, [walletInfo])

  const stepComponent = (currentStep) => {
    switch (currentStep) {
      case steps.selectDate:
        return <SelectDate selectableYearsRange={yearsRange} onDateSelected={(date) => setLockDate(date)} />
      case steps.selectJar:
        return (
          <SelectJar
            accountBalances={accountBalances}
            totalBalance={totalBalance}
            utxos={utxos}
            selectedJar={selectedJar}
            onJarSelected={(accountIndex) => setSelectedJar(accountIndex)}
          />
        )
      case steps.selectUtxos:
        return (
          <SelectUtxos
            walletInfo={walletInfo}
            jar={selectedJar}
            utxos={utxos[selectedJar]}
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
            utxos={utxos[selectedJar]}
            selectedUtxos={selectedUtxos}
            isLoading={isLoading}
          />
        )
      case steps.reviewInputs:
        if (isLoading) {
          return <div>Loading...</div>
        }

        if (timelockedAddress === null) {
          return <div>Could not load time locked address.</div>
        }

        return (
          <ReviewInputs
            lockDate={lockDate}
            jar={selectedJar}
            utxos={utxos[selectedJar]}
            selectedUtxos={selectedUtxos}
            timelockedAddress={timelockedAddress}
          />
        )

      case steps.createFidelityBond:
        return isLoading ? (
          <div className="d-flex justify-content-center align-items-center mt-5">
            <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            <div>Creating...</div>
          </div>
        ) : (
          <div className="d-flex justify-content-center align-items-center gap-2 mt-5">
            {alert === null ? (
              <>
                <Sprite className={styles.successCheckmark} symbol="checkmark" width="24" height="30" />
                Fidelity Bond Created!{' '}
              </>
            ) : (
              <>Couldn't create fidelity bond. </>
            )}
          </div>
        )
      default:
        return null
    }
  }

  const buttonText = (currentStep) => {
    switch (currentStep) {
      case steps.selectDate:
        return 'Next'
      case steps.selectJar:
        return 'Next'
      case steps.selectUtxos:
        if (!onlyCjOutUtxosSelected()) {
          return 'Select potentially less private UTXOs'
        }

        return 'Next'
      case steps.freezeUtxos:
        const utxosAreFrozen = fb.utxo.allAreFrozen(fb.utxo.utxosToFreeze(utxos[selectedJar], selectedUtxos))

        if (utxosAreFrozen) {
          return 'Next'
        } else if (alert !== null) {
          return 'Try Again'
        }

        return 'Freeze UTXOs'
      case steps.reviewInputs:
        if (timelockedAddress === null) return 'Try again'

        if (!onlyCjOutUtxosSelected()) {
          return 'Create fidelity bond with potentially less private UTXOs'
        }

        return 'Create fidelity bond'
      case steps.createFidelityBond:
        return alert === null ? 'Done' : 'Try Again'
      default:
        return null
    }
  }

  const onlyCjOutUtxosSelected = () => {
    return selectedUtxos.every((utxo) => walletInfo.addressSummary[utxo.address]?.status === 'cj-out')
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

      const utxosAreFrozen = fb.utxo.allAreFrozen(fb.utxo.utxosToFreeze(utxos[selectedJar], selectedUtxos))
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
      if (!isLoading && alert === null) {
        return steps.done
      }

      if (alert !== null) {
        return steps.failed
      }
    }

    return null
  }

  const onButtonClicked = () => {
    if (nextStep(step) === null) {
      return
    }

    if (step === steps.freezeUtxos) {
      const utxosToFreeze = fb.utxo.utxosToFreeze(utxos[selectedJar], selectedUtxos)
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

    if (nextStep(step) === steps.done) {
      reset()
      onDone()
    }

    if (nextStep(step) === steps.failed) {
      reset()
      return
    }

    setStep(nextStep(step))
  }

  return (
    <div className={styles.container}>
      {alert && <Alert {...alert} className="mt-0" onDismissed={() => setAlert(null)} />}
      <ConfirmModal
        isShown={showConfirmInputsModal}
        title={'Are you sure you want to lock your funds?'}
        onCancel={() => setShowConfirmInputsModal(false)}
        onConfirm={() => {
          setStep(steps.createFidelityBond)
          setShowConfirmInputsModal(false)
          directSweepToFidelityBond(selectedJar, timelockedAddress)
        }}
      >
        {`Be aware that your funds can only be moved again when the fidelity bond expires on ${new Date(
          lockDate
        ).toUTCString()}`}
      </ConfirmModal>
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div className="d-flex justify-content-between align-items-center">
          <div className={styles.title}>
            {otherFidelityBondExists ? 'Create another Fidelity Bond' : 'Long-term deposit with a Fidelity Bond'}
          </div>
          <Sprite symbol={isExpanded ? 'caret-up' : 'plus'} width="20" height="20" />
        </div>
        {!otherFidelityBondExists && (
          <div className="d-flex align-items-center justify-content-center gap-4 px-3 mt-3">
            <Sprite className={styles.subtitleJar} symbol="fb-clock" width="46px" height="74px" />
            <div className={styles.subtitle}>
              You increase your chance to be chosen as a market maker in a collaborative transaction by locking up some
              funds for a certain amount of time. Be aware that your bitcoin can only be moved again when the bond is
              expired.
            </div>
          </div>
        )}
      </div>
      <rb.Collapse in={isExpanded}>
        <div>
          <hr />
          <div className="mb-5">{stepComponent(step)}</div>
          <div className={styles.buttons}>
            {buttonText(step) !== null && (
              <rb.Button
                variant={nextStep(step) === steps.createFidelityBond && !onlyCjOutUtxosSelected() ? 'danger' : 'dark'}
                disabled={nextStep(step) === null}
                type="submit"
                onClick={onButtonClicked}
              >
                {buttonText(step)}
              </rb.Button>
            )}
            {step !== steps.createFidelityBond && (
              <rb.Button variant="white" type="submit" onClick={reset}>
                Cancel
              </rb.Button>
            )}
          </div>
        </div>
      </rb.Collapse>
    </div>
  )
}

export { CreateFidelityBond }
