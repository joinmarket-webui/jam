import { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { CurrentWallet, useReloadCurrentWalletInfo, Utxos, WalletInfo } from '../../context/WalletContext'
import { SelectJar } from './FidelityBondSteps'
import * as Api from '../../libs/JmWalletApi'
import * as fb from './utils'
import Alert from '../Alert'
import Sprite from '../Sprite'
import styles from './MoveFidelityBondModal.module.css'

type Input = {
  outpoint: Api.UtxoId
  scriptSig: string
  nSequence: number
  witness: string
}

type Output = {
  value_sats: Api.AmountSats
  scriptPubKey: string
  address: string
}

type TxInfo = {
  hex: string
  inputs: Input[]
  outputs: Output[]
  txid: Api.TxId
  nLocktime: number
  nVersion: number
}

interface Result {
  txInfo?: TxInfo
  mustReload: boolean
}

type MoveFidelityBondModalProps = {
  fidelityBondId: Api.UtxoId
  wallet: CurrentWallet
  walletInfo: WalletInfo
  onClose: (result: Result) => void
} & Omit<rb.ModalProps, 'onHide'>

const MoveFidelityBondModal = ({
  fidelityBondId,
  wallet,
  walletInfo,
  onClose,
  ...modalProps
}: MoveFidelityBondModalProps) => {
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const { t } = useTranslation()

  const [alert, setAlert] = useState<(rb.AlertProps & { message: string }) | undefined>()
  const [destinationJarIndex, setDestinationJarIndex] = useState<JarIndex>()

  const [txInfo, setTxInfo] = useState<TxInfo | undefined>()
  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<Api.UtxoId[]>([])

  const [parentMustReload, setParentMustReload] = useState(false)
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

          const message = t('global.errors.error_reloading_wallet_failed', {
            reason: err.message || t('global.errors.reason_unknown'),
          })
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

    if (txInfo) {
      onClose({ txInfo, mustReload: parentMustReload })
    } else {
      setParentMustReload(true)
      setAlert(undefined)
      setIsSending(true)
      sendFidelityBondToJar(destinationJarIndex)
        .then((data) => data.txinfo as TxInfo)
        .then((txinfo) => {
          setTxInfo(txinfo)

          setWaitForUtxosToBeSpent(txinfo.inputs.map((it) => it.outpoint))

          setIsSending(false)
        })
        .catch((e) => {
          setIsSending(false)

          const message = e instanceof Error ? e.message : t('global.errors.reason_unknown')
          setAlert({ variant: 'danger', message })
        })
    }
  }

  const sendFidelityBondToJar = async (targetJarIndex: JarIndex) => {
    if (!fidelityBond || fb.utxo.isLocked(fidelityBond)) {
      throw new Error(t('earn.fidelity_bond.move.error_fidelity_bond_still_locked'))
    }

    const abortCtrl = new AbortController()
    const { name: walletName, token } = wallet
    const requestContext = { walletName, token, signal: abortCtrl.signal }

    const destination = await Api.getAddressNew({ ...requestContext, mixdepth: targetJarIndex })
      .then((res) =>
        res.ok ? res.json() : Api.Helper.throwError(res, t('earn.fidelity_bond.move.error_loading_address'))
      )
      .then((data) => data.address as Api.BitcoinAddress)

    // reload utxos
    const utxos = await Api.getWalletUtxos(requestContext)
      .then((res) =>
        res.ok ? res.json() : Api.Helper.throwError(res, t('global.errors.error_reloading_wallet_failed'))
      )
      .then((data) => data.utxos as Utxos)
    const utxosToFreeze = utxos.filter((it) => it.mixdepth === fidelityBond.mixdepth).filter((it) => !it.frozen)

    const utxosThatWereFrozen: Api.UtxoId[] = []

    try {
      const freezeCalls = utxosToFreeze.map((utxo) =>
        Api.postFreeze(requestContext, { utxo: utxo.utxo, freeze: true })
          .then((res) => {
            if (!res.ok) {
              throw Api.Helper.throwError(res, t('earn.fidelity_bond.move.error_freezing_utxos'))
            }
          })
          .then((_) => utxosThatWereFrozen.push(utxo.utxo))
      )
      // freeze other coins
      await Promise.all(freezeCalls)

      // unfreeze fidelity bond
      await Api.postFreeze(requestContext, { utxo: fidelityBond.utxo, freeze: false }).then((res) => {
        if (!res.ok) {
          throw Api.Helper.throwError(res, t('earn.fidelity_bond.move.error_unfreezing_fidelity_bond'))
        }
      })
      // spend fidelity bond (by sweeping whole jar)
      return await Api.postDirectSend(requestContext, {
        destination,
        mixdepth: fidelityBond.mixdepth,
        amount_sats: 0, // sweep
      }).then((res) => {
        if (!res.ok) {
          throw Api.Helper.throwError(res, t('earn.fidelity_bond.move.error_spending_fidelity_bond'))
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
          {t('earn.fidelity_bond.move.text_moving')}
        </>
      )
    } else if (txInfo) {
      return <>{t('earn.fidelity_bond.move.text_button_done')}</>
    }
    return <>{t('earn.fidelity_bond.move.text_button_submit')}</>
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
        <div className="d-flex justify-content-center align-items-center my-5">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          <div>{t(`earn.fidelity_bond.move.${isSending ? 'text_moving' : 'text_loading'}`)}</div>
        </div>
      )
    }

    if (txInfo) {
      return <Done text={t('earn.fidelity_bond.move.success_text')} />
    }

    return (
      <SelectJar
        description={t('earn.fidelity_bond.move.select_jar.description')}
        accountBalances={walletInfo.balanceSummary.accountBalances}
        totalBalance={walletInfo.balanceSummary.totalBalance}
        isJarSelectable={() => true}
        selectedJar={destinationJarIndex}
        onJarSelected={setDestinationJarIndex}
      />
    )
  }

  return (
    <rb.Modal
      animation={true}
      backdrop="static"
      centered={true}
      keyboard={false}
      size="lg"
      {...modalProps}
      onHide={() => onClose({ txInfo, mustReload: parentMustReload })}
    >
      <rb.Modal.Header closeButton>
        <rb.Modal.Title>{t('earn.fidelity_bond.move.title')}</rb.Modal.Title>
      </rb.Modal.Header>
      <rb.Modal.Body>
        {alert && <Alert {...alert} className="mt-0" onClose={() => setAlert(undefined)} />}
        {ModalBodyContent()}
      </rb.Modal.Body>
      <rb.Modal.Footer>
        <div className="w-100 d-flex gap-4 justify-content-center align-items-center">
          <rb.Button
            variant="light"
            disabled={isLoading}
            onClick={() => onClose({ txInfo, mustReload: parentMustReload })}
            className="flex-1 justify-content-center align-items-center"
          >
            {t('earn.fidelity_bond.move.text_button_cancel')}
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

export { MoveFidelityBondModal }
