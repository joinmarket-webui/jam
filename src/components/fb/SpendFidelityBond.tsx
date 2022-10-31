import { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { CurrentWallet, useReloadCurrentWalletInfo, Utxos, WalletInfo } from '../../context/WalletContext'
import { SelectJar } from './FidelityBondSteps'
import * as Api from '../../libs/JmWalletApi'
import Alert from '../Alert'
import Sprite from '../Sprite'
import styles from './SpendFidelityBond.module.css'

type InputPartial = {
  outpoint: Api.UtxoId
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
  const [destinationJarIndex, setDestinationJarIndex] = useState<JarIndex>()

  const [successfulSendData, setSuccessfulSendData] = useState<any | undefined>()
  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<Api.UtxoId[]>([])

  const [isSending, setIsSending] = useState(false)
  const isLoading = useMemo(() => isSending || waitForUtxosToBeSpent.length > 0, [isSending, waitForUtxosToBeSpent])

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

  const onPrimaryButtonClicked = () => {
    if (isLoading) return
    if (destinationJarIndex === undefined) return
    if (waitForUtxosToBeSpent.length > 0) return

    if (successfulSendData) {
      modalProps.onHide && modalProps.onHide()
    } else {
      setAlert(undefined)
      setIsSending(true)
      sendFidelityBondToJar(destinationJarIndex)
        .then((data) => {
          setSuccessfulSendData(data)

          const inputs = data.txinfo.inputs as InputPartial[]
          setWaitForUtxosToBeSpent(inputs.map((it) => it.outpoint as Api.UtxoId))

          setIsSending(false)
        })
        .catch((e) => {
          setIsSending(false)

          const message = e instanceof Error ? e.message : 'Unknown Error'
          setAlert({ variant: 'danger', message })
        })
    }
  }

  const sendFidelityBondToJar = async (targetJarIndex: JarIndex) => {
    if (!fidelityBond) {
      throw new Error('Precondition failed')
    }

    const abortCtrl = new AbortController()
    const { name: walletName, token } = wallet
    const requestContext = { walletName, token, signal: abortCtrl.signal }

    const destination = await Api.getAddressNew({ ...requestContext, mixdepth: targetJarIndex })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('receive.error_loading_address_failed'))))
      .then((data) => data.address as Api.BitcoinAddress)

    // reload utxos
    const utxos = await Api.getWalletUtxos(requestContext)
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res)))
      .then((data) => data.utxos as Utxos)
    const utxosToFreeze = utxos.filter((it) => it.mixdepth === fidelityBond.mixdepth).filter((it) => !it.frozen)

    const utxosThatWereFrozen: Api.UtxoId[] = []

    try {
      const freezeCalls = utxosToFreeze.map((utxo) =>
        Api.postFreeze(requestContext, { utxo: utxo.utxo, freeze: true })
          .then((res) => {
            if (!res.ok) {
              throw Api.Helper.throwError(res, t('earn.fidelity_bond.error_freezing_utxos'))
            }
          })
          .then((_) => utxosThatWereFrozen.push(utxo.utxo))
      )
      // freeze other coins
      await Promise.all(freezeCalls)

      // unfreeze fidelity bond
      await Api.postFreeze(requestContext, { utxo: fidelityBond.utxo, freeze: false }).then((res) => {
        // TODO: translate
        if (!res.ok) {
          throw Api.Helper.throwError(res, 'Error while unfreezing fidelity bond')
        }
      })
      // spend fidelity bond (by sweeping whole jar)
      return await Api.postDirectSend(requestContext, {
        destination,
        mixdepth: fidelityBond.mixdepth,
        amount_sats: 0, // sweep
      }).then((res) => {
        // TODO: translate
        if (!res.ok) {
          throw Api.Helper.throwError(res, 'Error while spending fidelity bond')
        }
        return res.json()
      })
    } finally {
      // unfreeze all previously frozen coins
      const unfreezeCalls = utxosThatWereFrozen.map((utxo) => Api.postFreeze(requestContext, { utxo, freeze: false }))

      try {
        await Promise.all(unfreezeCalls)
      } catch (e) {
        // don't throw, just log, as we are in a finally block
        console.error(e)
      }
    }
  }

  const primaryButtonContent = () => {
    if (isSending) {
      return (
        <>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('global.moving')}
        </>
      )
    } else if (successfulSendData) {
      return <>{t('global.done')}</>
    }
    return <>{t('global.move')}</>
  }

  const Done = ({ text }: { text: string }) => {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center gap-1">
        <div className={styles.successCheckmark}>
          <Sprite symbol="checkmark" width="24" height="30" />
        </div>
        <div className={styles.successSummaryTitle}>{text}</div>
      </div>
    )
  }

  const ModalBodyContent = () => {
    if (isLoading) {
      return (
        <div className="d-flex justify-content-center align-items-center mt-5 mb-5">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          <div>{isSending ? 'Moving...' : 'Loading...'}</div>
        </div>
      )
    }

    if (successfulSendData && waitForUtxosToBeSpent.length === 0) {
      return <Done text={t('earn.fidelity_bond.select_jar.description')} />
    }

    return (
      <SelectJar
        description={t('earn.fidelity_bond.select_jar.description')}
        accountBalances={walletInfo.balanceSummary.accountBalances}
        totalBalance={walletInfo.balanceSummary.totalBalance}
        isJarSelectable={() => true}
        selectedJar={destinationJarIndex}
        onJarSelected={setDestinationJarIndex}
      />
    )
  }

  return (
    <rb.Modal animation={true} backdrop="static" centered={true} keyboard={false} size="lg" {...modalProps}>
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{t('settings.fees.title')}</rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
        {alert && <Alert {...alert} className="mt-0" onClose={() => setAlert(undefined)} />}
        {ModalBodyContent()}
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
            disabled={isLoading || destinationJarIndex === undefined}
            onClick={onPrimaryButtonClicked}
          >
            {primaryButtonContent()}
          </rb.Button>
        </div>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}

export { SpendFidelityBondModal }
