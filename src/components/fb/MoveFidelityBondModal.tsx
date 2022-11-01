import { useEffect, useMemo, useRef, useState } from 'react'
import * as rb from 'react-bootstrap'
import { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { CurrentWallet, useReloadCurrentWalletInfo, Utxo, Utxos, WalletInfo } from '../../context/WalletContext'
import * as Api from '../../libs/JmWalletApi'
import * as fb from './utils'
import Alert from '../Alert'
import Sprite from '../Sprite'
import { SelectJar } from './FidelityBondSteps'
import { PaymentConfirmModal } from '../PaymentConfirmModal'
import { jarInitial } from '../jars/Jar'

import styles from './MoveFidelityBondModal.module.css'
import { FeeValues, useLoadFeeConfigValues } from '../../hooks/Fees'

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

const errorResolver = (t: TFunction<'translation', undefined>, i18nKey: string | string[]) => ({
  resolver: (_: Response, reason: string) => `${t(i18nKey)} ${reason}`,
  fallbackReason: t('global.errors.reason_unknown'),
})

type UtxoDirectSendRequest = {
  destination: Api.BitcoinAddress
  sourceJarIndex: JarIndex
  utxos: Utxos
}

type UtxoDirectSendHook = {
  onReloadWalletError: (res: Response) => Promise<never>
  onFreezeUtxosError: (res: Response) => Promise<never>
  onUnfreezeUtxosError: (res: Response) => Promise<never>
  onSendError: (res: Response) => Promise<never>
}

const spendUtxosWithDirectSend = async (
  context: Api.WalletRequestContext,
  request: UtxoDirectSendRequest,
  hooks: UtxoDirectSendHook
) => {
  const utxosFromSameJar = request.utxos.every((it) => it.mixdepth === request.sourceJarIndex)
  if (!utxosFromSameJar || request.utxos.length === 0) {
    // this is programming error (no translation needed)
    throw new Error('Precondition failed: UTXOs must be from the same jar')
  }

  const spendableUtxoIds = request.utxos.map((it) => it.utxo)

  // reload utxos
  const utxos = await Api.getWalletUtxos(context)
    .then((res) => (res.ok ? res.json() : hooks.onReloadWalletError(res)))
    .then((data) => data.utxos as Utxos)

  const utxosToSpend = utxos.filter((it) => spendableUtxoIds.includes(it.utxo))

  const utxosToFreeze = utxos
    .filter((it) => it.mixdepth === request.sourceJarIndex)
    .filter((it) => !it.frozen)
    .filter((it) => !spendableUtxoIds.includes(it.utxo))

  const utxosThatWereFrozen: Api.UtxoId[] = []
  const utxosThatWereUnfrozen: Api.UtxoId[] = []

  try {
    const freezeCalls = utxosToFreeze.map((utxo) =>
      Api.postFreeze(context, { utxo: utxo.utxo, freeze: true })
        .then((res) => {
          if (!res.ok) {
            return hooks.onFreezeUtxosError(res)
          }
        })
        .then((_) => utxosThatWereFrozen.push(utxo.utxo))
    )
    // freeze other coins
    await Promise.all(freezeCalls)

    const unfreezeCalls = utxosToSpend
      .filter((it) => it.frozen)
      .map((utxo) =>
        Api.postFreeze(context, { utxo: utxo.utxo, freeze: false })
          .then((res) => {
            if (!res.ok) {
              return hooks.onUnfreezeUtxosError(res)
            }
          })
          .then((_) => utxosThatWereUnfrozen.push(utxo.utxo))
      )
    // unfreeze potentially frozen coins that are about to be spend
    await Promise.all(unfreezeCalls)

    // spend fidelity bond (by sweeping whole jar)
    return await Api.postDirectSend(context, {
      destination: request.destination,
      mixdepth: request.sourceJarIndex,
      amount_sats: 0, // sweep
    }).then((res) => {
      if (!res.ok) {
        return hooks.onSendError(res)
      }
      return res.json()
    })
  } finally {
    // unfreeze all previously frozen coins
    const unfreezeCalls = utxosThatWereFrozen.map((utxo) => Api.postFreeze(context, { utxo, freeze: false }))

    try {
      await Promise.allSettled(unfreezeCalls)
    } catch (e) {
      // don't throw, just log, as we are in a finally block
      console.error('Error while unfreezing previously frozen UTXOs', e)
    }

    // freeze all previously unfrozen coins
    const freezeCalls = utxosThatWereUnfrozen.map((utxo) => Api.postFreeze(context, { utxo, freeze: true }))

    try {
      await Promise.allSettled(freezeCalls)
    } catch (e) {
      // don't throw, just log, as we are in a finally block
      console.error('Error while freezing previously unfrozen UTXOs', e)
    }
  }
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
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const loadFeeConfigValues = useLoadFeeConfigValues()

  const [alert, setAlert] = useState<(rb.AlertProps & { message: string }) | undefined>()
  const [destinationJarIndex, setDestinationJarIndex] = useState<JarIndex>()

  const [txInfo, setTxInfo] = useState<TxInfo | undefined>()
  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<Api.UtxoId[]>([])

  const [parentMustReload, setParentMustReload] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const isLoading = useMemo(() => isSending || waitForUtxosToBeSpent.length > 0, [isSending, waitForUtxosToBeSpent])

  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false)
  const [feeConfigValues, setFeeConfigValues] = useState<FeeValues>()

  const submitButtonRef = useRef<HTMLButtonElement>(null)

  const fidelityBond = useMemo(() => {
    return walletInfo.data.utxos.utxos.find((utxo) => utxo.utxo === fidelityBondId)
  }, [walletInfo, fidelityBondId])

  useEffect(() => {
    const abortCtrl = new AbortController()

    loadFeeConfigValues(abortCtrl.signal)
      .then((data) => {
        if (abortCtrl.signal.aborted) return
        setFeeConfigValues(data)
      })
      .catch((e) => {
        if (abortCtrl.signal.aborted) return
        // As fee config is not essential, don't raise an error on purpose.
        // Fee settings cannot be displayed, but making a payment is still possible.
        setFeeConfigValues(undefined)
      })

    return () => {
      abortCtrl.abort()
    }
  }, [loadFeeConfigValues])
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
    } else if (!showConfirmSendModal) {
      setShowConfirmSendModal(true)
    } else {
      setShowConfirmSendModal(false)
      setParentMustReload(true)

      setAlert(undefined)
      setIsSending(true)

      sendFidelityBondToJar(fidelityBond, destinationJarIndex)
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

  const sendFidelityBondToJar = async (fidelityBond: Utxo | undefined, targetJarIndex: JarIndex) => {
    if (!fidelityBond || fb.utxo.isLocked(fidelityBond)) {
      throw new Error(t('earn.fidelity_bond.move.error_fidelity_bond_still_locked'))
    }

    const abortCtrl = new AbortController()
    const { name: walletName, token } = wallet
    const requestContext = { walletName, token, signal: abortCtrl.signal }

    const destination = await Api.getAddressNew({ ...requestContext, mixdepth: targetJarIndex })
      .then((res) => {
        if (res.ok) return res.json()
        return Api.Helper.throwResolved(res, errorResolver(t, 'earn.fidelity_bond.move.error_loading_address'))
      })
      .then((data) => data.address as Api.BitcoinAddress)

    return await spendUtxosWithDirectSend(
      requestContext,
      {
        destination,
        sourceJarIndex: fidelityBond.mixdepth,
        utxos: [fidelityBond],
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
      }
    )
  }

  const PrimaryButtonContent = () => {
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
      return (
        <div className="my-4">
          <Done text={t('earn.fidelity_bond.move.success_text')} />
        </div>
      )
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
    <>
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
              ref={submitButtonRef}
              variant="dark"
              className="flex-1 justify-content-center align-items-center"
              disabled={isLoading || destinationJarIndex === undefined}
              onClick={onPrimaryButtonClicked}
            >
              {PrimaryButtonContent()}
            </rb.Button>
          </div>
        </rb.Modal.Footer>
      </rb.Modal>
      {fidelityBond && destinationJarIndex && (
        <PaymentConfirmModal
          isShown={showConfirmSendModal}
          title={t('earn.fidelity_bond.move.confirm_send_modal.title')}
          onCancel={() => setShowConfirmSendModal(false)}
          onConfirm={() => {
            submitButtonRef.current?.click()
          }}
          data={{
            sourceJarId: null, // dont show a source jar - might be confusing in this context
            destination: t('send.confirm_send_modal.text_source_jar', { jarId: jarInitial(destinationJarIndex) }),
            amount: `${fidelityBond.value}`,
            isSweep: false, // don't show as sweep asother utxos will be frozen - might be confusing in this context
            isCoinjoin: false, // not sent as a collaborative transaction
            numCollaborators: null,
            feeConfigValues,
          }}
        />
      )}
    </>
  )
}

export { MoveFidelityBondModal }
