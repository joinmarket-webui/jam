import { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { CurrentWallet, useReloadCurrentWalletInfo, Utxo, Utxos, WalletInfo } from '../../context/WalletContext'
import { Done, FreezeUtxos, SelectJar } from './FidelityBondSteps'
import * as fb from './utils'
import * as Api from '../../libs/JmWalletApi'
import Alert from '../Alert'

const steps = {
  selectJar: 1,
  freezeUtxos: 2,
  spendFidelityBond: 3,
  unfreezeUtxos: 4,
  done: 5,
  failed: 6,
}

interface SpendFidelityBondProps {
  fidelityBond?: Utxo
  walletInfo: WalletInfo
  step: number
  isLoading: boolean
  selectedJar?: JarIndex
  setSelectedJar: (jar: JarIndex) => void
}

const SpendFidelityBond = ({
  fidelityBond,
  walletInfo,
  step,
  isLoading,
  selectedJar,
  setSelectedJar,
}: SpendFidelityBondProps) => {
  const { t } = useTranslation()

  const stepComponent = (currentStep: number) => {
    switch (currentStep) {
      case steps.selectJar:
        return (
          <SelectJar
            description={t('earn.fidelity_bond.select_jar.description')}
            accountBalances={walletInfo.balanceSummary.accountBalances}
            totalBalance={walletInfo.balanceSummary.totalBalance}
            isJarSelectable={() => true}
            selectedJar={selectedJar}
            onJarSelected={setSelectedJar}
          />
        )
      case steps.freezeUtxos:
        return (
          <>
            {fidelityBond && (
              <FreezeUtxos
                walletInfo={walletInfo}
                jar={fidelityBond.mixdepth}
                utxos={walletInfo.utxosByJar[fidelityBond.mixdepth]}
                selectedUtxos={[fidelityBond]}
                isLoading={isLoading}
              />
            )}
          </>
        )
      /*case steps.reviewInputs:
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
                utxos={walletInfo.utxosByJar[selectedJar]}
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
            )*/
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

  return <>{stepComponent(step)}</>
}

type SpendFidelityBondModalProps = {
  fidelityBondId: Api.UtxoId
  wallet: CurrentWallet
  walletInfo: WalletInfo
} & rb.ModalProps

const SpendFidelityBondModal = ({ fidelityBondId, wallet, walletInfo, ...modalProps }: SpendFidelityBondModalProps) => {
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const { t } = useTranslation()

  const [alert, setAlert] = useState<(rb.AlertProps & { message: string }) | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(steps.selectJar)
  //const [nextStep, setNextStep] = useState<number>()

  const [destinationJarIndex, setDestinationJarIndex] = useState<JarIndex>()
  const [frozenUtxoIds, setFrozenUtxoIds] = useState<Api.UtxoId[]>([])

  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<Api.UtxoId[]>([])

  const fidelityBond = useMemo(() => {
    return walletInfo.data.utxos.utxos.find((utxo) => utxo.utxo === fidelityBondId)
  }, [walletInfo, fidelityBondId])

  // This callback is responsible for updating the `isLoading` flag while the
  // wallet is synchronizing. The wallet needs some time after a tx is sent
  // to reflect the changes internally. In order to show the actual balance,
  // all outputs in `waitForUtxosToBeSpent` must have been removed from the
  // wallet's utxo set.
  useEffect(() => {
    if (waitForUtxosToBeSpent.length === 0) return

    const abortCtrl = new AbortController()

    // Delaying the poll requests gives the wallet some time to synchronize
    // the utxo set and reduces amount of http requests
    const initialDelayInMs = 250
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return

      reloadCurrentWalletInfo({ signal: abortCtrl.signal })
        .then((data) => {
          if (abortCtrl.signal.aborted) return

          const outputs = data.data.utxos.utxos.map((it) => it.utxo)
          const utxosStillPresent = waitForUtxosToBeSpent.filter((it) => outputs.includes(it))
          setWaitForUtxosToBeSpent([...utxosStillPresent])
        })
        .catch((err) => {
          if (abortCtrl.signal.aborted) return

          // Stop waiting for wallet synchronization on errors, but inform
          // the user that loading the wallet info failed
          setWaitForUtxosToBeSpent([])

          const message = err.message || t('send.error_loading_wallet_failed')
          setAlert({ variant: 'danger', message })
        })
    }, initialDelayInMs)

    return () => {
      abortCtrl.abort()
      clearTimeout(timer)
    }
  }, [waitForUtxosToBeSpent, reloadCurrentWalletInfo, t])

  const freezeUtxos = (utxos: Utxos) => {
    return changeUtxoFreeze(utxos, true)
  }

  const unfreezeUtxos = (utxos: Utxos) => {
    return changeUtxoFreeze(utxos, false)
  }

  const changeUtxoFreeze = (utxos: Utxos, freeze: boolean) => {
    setIsLoading(true)

    let utxosThatWereFrozen: Api.UtxoId[] = []

    const { name: walletName, token } = wallet
    const freezeCalls = utxos.map((utxo) =>
      Api.postFreeze({ walletName, token }, { utxo: utxo.utxo, freeze: freeze }).then((res) => {
        if (res.ok) {
          if (!utxo.frozen && freeze) {
            utxosThatWereFrozen.push(utxo.utxo)
          }
        } else {
          return Api.Helper.throwError(
            res,
            freeze ? t('earn.fidelity_bond.error_freezing_utxos') : t('earn.fidelity_bond.error_unfreezing_utxos')
          )
        }
      })
    )

    const abortCtrl = new AbortController()
    return Promise.all(freezeCalls)
      .then((_) => reloadCurrentWalletInfo({ signal: abortCtrl.signal }))
      .then(
        (_) =>
          freeze &&
          setFrozenUtxoIds((current) => {
            const notIncluded = utxosThatWereFrozen.filter((utxo) => !current.includes(utxo))
            return [...current, ...notIncluded]
          })
      )
      .finally(() => {
        setIsLoading(false)
      })
  }

  const nextStep = (currentStep: number) => {
    if (currentStep === steps.selectJar) {
      if (fidelityBond === undefined) return null
      if (destinationJarIndex === undefined) return null

      const utxosAreFrozen = fb.utxo.allAreFrozen(
        fb.utxo.utxosToFreeze(walletInfo.utxosByJar[fidelityBond.mixdepth], [fidelityBond])
      )

      if (utxosAreFrozen && fidelityBond.frozen !== true) {
        return steps.spendFidelityBond
      } else {
        return steps.freezeUtxos
      }
    }

    if (currentStep === steps.freezeUtxos) {
      if (isLoading) return null
      if (fidelityBond === undefined) return null

      const utxosAreFrozen = fb.utxo.allAreFrozen(
        fb.utxo.utxosToFreeze(walletInfo.utxosByJar[fidelityBond.mixdepth], [fidelityBond])
      )

      if (utxosAreFrozen && fidelityBond.frozen !== true) {
        return steps.spendFidelityBond
      }

      return steps.freezeUtxos
    }

    if (currentStep === steps.spendFidelityBond) {
      if (isLoading) return null
      if (alert !== undefined) return steps.failed
      if (fidelityBond !== undefined) return null

      if (frozenUtxoIds.length > 0) return steps.unfreezeUtxos

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

  const primaryButtonText = (currentStep: number) => {
    switch (currentStep) {
      case steps.selectJar:
        return t('global.next')
      case steps.freezeUtxos:
        if (fidelityBond === undefined) return 'Error'
        const utxosAreFrozen = fb.utxo.allAreFrozen(
          fb.utxo.utxosToFreeze(walletInfo.utxosByJar[fidelityBond.mixdepth], [fidelityBond])
        )

        if (utxosAreFrozen && fidelityBond.frozen !== true) {
          return t('global.next')
        } else if (alert !== undefined) {
          return t('global.retry')
        }

        return t('global.freeze.utxos')

      case steps.spendFidelityBond:
        if (alert !== undefined) {
          return t('try again')
        }

        return t('global.spend')
      /*case steps.unfreezeUtxos:
        return t('earn.fidelity_bond.unfreeze_utxos.text_primary_button')*/
      default:
        return null
    }
  }

  const onPrimaryButtonClicked = () => {
    const next = nextStep(step)
    console.log(`current: ${step} -> next: ${next}`)

    if (step === steps.freezeUtxos) {
      if (fidelityBond === undefined) return
      const utxosToFreeze = fb.utxo.utxosToFreeze(walletInfo.utxosByJar[fidelityBond.mixdepth], [fidelityBond])
      const utxosAreFrozen = fb.utxo.allAreFrozen(utxosToFreeze)

      Promise.all([
        ...(!utxosAreFrozen ? [freezeUtxos(utxosToFreeze)] : []),
        ...(fidelityBond.frozen === true ? [unfreezeUtxos([fidelityBond])] : []),
      ])
        .then((_) => setAlert(undefined))
        .catch((err) => {
          setAlert({ variant: 'danger', message: err.message, dismissible: false })
        })
    }

    if (step === steps.spendFidelityBond) {
      if (fidelityBond === undefined) return
      if (destinationJarIndex === undefined) return
      if (isLoading) return

      const abortCtrl = new AbortController()
      const { name: walletName, token } = wallet
      const requestContext = { walletName, token, signal: abortCtrl.signal }

      setIsLoading(true)
      Api.getAddressNew({ ...requestContext, mixdepth: destinationJarIndex })
        .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('receive.error_loading_address_failed'))))
        .then((data) => data.address)
        // spend fidelity bond (by sweeping whole jar)
        .then((destination) =>
          Api.postDirectSend(requestContext, {
            destination,
            mixdepth: fidelityBond!.mixdepth,
            amount_sats: 0, // sweep
          })
        )
        .then((res) => {
          // TODO: translate
          if (!res.ok) throw Api.Helper.throwError(res, 'Error while spending fidelity bond')
          return res.json()
        })
        .then((data) => {
          const inputs = data.txinfo.inputs as Array<any>
          setWaitForUtxosToBeSpent(inputs.map((it) => it.outpoint as Api.UtxoId))
        })
      // setShowConfirmInputsModal(true)
      //return
    }

    if (next === steps.unfreezeUtxos) {
      //unfreezeUtxos(frozenUtxos)
    }

    if (next === steps.failed) {
      //reset()
      return
    }

    /*if (next === steps.done) {
      //reset()
      modalProps.onHide && modalProps.onHide()
      return
    }*/

    if (next !== null) {
      setStep(next)
    }
  }

  return (
    <rb.Modal animation={true} backdrop="static" centered={true} keyboard={false} size="lg" {...modalProps}>
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{t('settings.fees.title')}</rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
        {alert && <Alert {...alert} className="mt-0" onClose={() => setAlert(undefined)} />}

        {step}
        <SpendFidelityBond
          step={step}
          selectedJar={destinationJarIndex}
          setSelectedJar={setDestinationJarIndex}
          isLoading={isLoading}
          fidelityBond={fidelityBond}
          walletInfo={walletInfo}
        />
      </rb.Modal.Body>
      <rb.Modal.Footer>
        <div className="w-100 d-flex gap-4 justify-content-center align-items-center">
          <rb.Button
            variant="light"
            onClick={modalProps.onHide}
            className="flex-1 justify-content-center align-items-center"
          >
            {t('settings.fees.text_button_cancel')}
          </rb.Button>
          <rb.Button
            variant="dark"
            className="flex-1 justify-content-center align-items-center"
            disabled={nextStep(step) === null}
            onClick={onPrimaryButtonClicked}
          >
            {primaryButtonText(step)}
          </rb.Button>
        </div>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}

export { SpendFidelityBondModal }
