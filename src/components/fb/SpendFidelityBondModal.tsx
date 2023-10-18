import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as rb from 'react-bootstrap'
import { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { CurrentWallet, useReloadCurrentWalletInfo, Utxo, Utxos, WalletInfo } from '../../context/WalletContext'
import * as Api from '../../libs/JmWalletApi'
import * as fb from './utils'
import Alert from '../Alert'
import Sprite from '../Sprite'
import { SelectDate, SelectJar } from './FidelityBondSteps'
import { PaymentConfirmModal } from '../PaymentConfirmModal'
import { jarInitial } from '../jars/Jar'
import { useFeeConfigValues } from '../../hooks/Fees'

import styles from './SpendFidelityBondModal.module.css'
import { isDebugFeatureEnabled } from '../../constants/debugFeatures'
import { CopyButton } from '../CopyButton'
import { LockInfoAlert } from './CreateFidelityBond'

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

const errorResolver = (t: TFunction, i18nKey: string | string[]) => ({
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
  hooks: UtxoDirectSendHook,
) => {
  const utxosFromSameJar = request.utxos.every((it) => it.mixdepth === request.sourceJarIndex)
  if (!utxosFromSameJar || request.utxos.length === 0) {
    // this is a programming error (no translation needed)
    throw new Error('Precondition failed: UTXOs must be from the same jar')
  }

  const spendableUtxoIds = request.utxos.map((it) => it.utxo)

  // reload utxos
  const utxosFromSourceJar = (
    await Api.getWalletUtxos(context)
      .then((res) => (res.ok ? res.json() : hooks.onReloadWalletError(res)))
      .then((data) => data.utxos as Utxos)
  ).filter((utxo) => utxo.mixdepth === request.sourceJarIndex)

  const utxosToSpend = utxosFromSourceJar.filter((it) => spendableUtxoIds.includes(it.utxo))

  const utxosToFreeze = utxosFromSourceJar
    .filter((it) => !it.frozen)
    .filter((it) => !spendableUtxoIds.includes(it.utxo))

  const utxosThatWereFrozen: Api.UtxoId[] = []
  const utxosThatWereUnfrozen: Api.UtxoId[] = []

  try {
    const freezeCalls = utxosToFreeze.map((utxo) =>
      Api.postFreeze(context, { utxo: utxo.utxo, freeze: true }).then((res) => {
        if (!res.ok) return hooks.onFreezeUtxosError(res)
        utxosThatWereFrozen.push(utxo.utxo)
      }),
    )
    // freeze unused coins not part of the payment
    await Promise.all(freezeCalls)

    const unfreezeCalls = utxosToSpend
      .filter((it) => it.frozen)
      .map((utxo) =>
        Api.postFreeze(context, { utxo: utxo.utxo, freeze: false }).then((res) => {
          if (!res.ok) return hooks.onUnfreezeUtxosError(res)
          utxosThatWereUnfrozen.push(utxo.utxo)
        }),
      )
    // unfreeze potentially frozen coins that are about to be spent
    await Promise.all(unfreezeCalls)

    // spend fidelity bond (by sweeping whole jar)
    return await Api.postDirectSend(context, {
      destination: request.destination,
      mixdepth: request.sourceJarIndex,
      amount_sats: 0, // sweep
    }).then((res) => (res.ok ? res.json() : hooks.onSendError(res)))
  } finally {
    try {
      // try unfreezing all previously frozen coins
      const unfreezeCalls = utxosThatWereFrozen.map((utxo) => Api.postFreeze(context, { utxo, freeze: false }))

      await Promise.allSettled(unfreezeCalls)
    } catch (e) {
      // don't throw, just log, as we are in a finally block
      console.error('Error while unfreezing previously frozen UTXOs', e)
    }

    try {
      // try freezing all previously unfrozen coins
      const freezeCalls = utxosThatWereUnfrozen.map((utxo) => Api.postFreeze(context, { utxo, freeze: true }))

      await Promise.allSettled(freezeCalls)
    } catch (e) {
      // don't throw, just log, as we are in a finally block
      console.error('Error while freezing previously unfrozen UTXOs', e)
    }
  }
}

type SendFidelityBondToAddressProps = {
  fidelityBond: Utxo | undefined
  destination: Api.BitcoinAddress
  wallet: CurrentWallet
  t: TFunction
}

const sendFidelityBondToAddress = async ({ fidelityBond, destination, wallet, t }: SendFidelityBondToAddressProps) => {
  if (!fidelityBond || fb.utxo.isLocked(fidelityBond)) {
    throw new Error(t('earn.fidelity_bond.move.error_fidelity_bond_still_locked'))
  }

  const abortCtrl = new AbortController()
  const requestContext = { ...wallet, signal: abortCtrl.signal }

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
    },
  )
}

type SendFidelityBondToJarProps = {
  fidelityBond: Utxo | undefined
  targetJarIndex: JarIndex
  wallet: CurrentWallet
  t: TFunction
}

const sendFidelityBondToJar = async ({ fidelityBond, targetJarIndex, wallet, t }: SendFidelityBondToJarProps) => {
  if (!fidelityBond || fb.utxo.isLocked(fidelityBond)) {
    throw new Error(t('earn.fidelity_bond.move.error_fidelity_bond_still_locked'))
  }

  const abortCtrl = new AbortController()
  const requestContext = { ...wallet, signal: abortCtrl.signal }

  const destination = await Api.getAddressNew({ ...requestContext, mixdepth: targetJarIndex })
    .then((res) => {
      if (res.ok) return res.json()
      return Api.Helper.throwResolved(res, errorResolver(t, 'earn.fidelity_bond.move.error_loading_address'))
    })
    .then((data) => data.address as Api.BitcoinAddress)

  return await sendFidelityBondToAddress({ destination, fidelityBond, wallet, t })
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

type RenewFidelityBondModalProps = {
  fidelityBondId: Api.UtxoId
  wallet: CurrentWallet
  walletInfo: WalletInfo
  onClose: (result: Result) => void
} & Omit<rb.ModalProps, 'onHide'>

const RenewFidelityBondModal = ({
  fidelityBondId,
  wallet,
  walletInfo,
  onClose,
  ...modalProps
}: RenewFidelityBondModalProps) => {
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const feeConfigValues = useFeeConfigValues()[0]

  const [alert, setAlert] = useState<SimpleAlert>()

  const [txInfo, setTxInfo] = useState<TxInfo>()
  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<Api.UtxoId[]>([])

  const [lockDate, setLockDate] = useState<Api.Lockdate>()
  const [timelockedAddress, setTimelockedAddress] = useState<Api.BitcoinAddress>()

  const [parentMustReload, setParentMustReload] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingTimelockedAddress, setIsLoadingTimelockAddress] = useState(false)
  const isLoading = useMemo(() => isSending || waitForUtxosToBeSpent.length > 0, [isSending, waitForUtxosToBeSpent])

  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false)

  const submitButtonRef = useRef<HTMLButtonElement>(null)

  const fidelityBond = useMemo(() => {
    return walletInfo.data.utxos.utxos.find((utxo) => utxo.utxo === fidelityBondId)
  }, [walletInfo, fidelityBondId])

  // This callback is responsible for updating the loading state when the
  // the payment is made. The wallet needs some time after a tx is sent
  // to reflect the changes internally. All outputs in
  // `waitForUtxosToBeSpent` must have been removed from the wallet
  // for the payment to be considered done.
  useEffect(() => {
    if (waitForUtxosToBeSpent.length === 0) return

    const abortCtrl = new AbortController()

    // Delaying the poll requests gives the wallet some time to synchronize
    // the utxo set and reduces amount of http requests
    const initialDelayInMs = 250
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return

      reloadCurrentWalletInfo
        .reloadUtxos({ signal: abortCtrl.signal })
        .then((res) => {
          if (abortCtrl.signal.aborted) return

          const outputs = res.utxos.map((it) => it.utxo)
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

  const yearsRange = useMemo(() => {
    if (isDebugFeatureEnabled('allowCreatingExpiredFidelityBond')) {
      return fb.toYearsRange(-1, fb.DEFAULT_MAX_TIMELOCK_YEARS)
    }
    return fb.toYearsRange(0, fb.DEFAULT_MAX_TIMELOCK_YEARS)
  }, [])

  const loadTimeLockedAddress = useCallback(
    (lockdate: Api.Lockdate, signal: AbortSignal) => {
      setIsLoadingTimelockAddress(true)
      setAlert(undefined)

      return (
        Api.getAddressTimelockNew({
          ...wallet,
          lockdate,
          signal,
        })
          .then((res) => {
            return res.ok ? res.json() : Api.Helper.throwError(res, t('earn.fidelity_bond.error_loading_address'))
          })
          // show the loader a little longer to avoid flickering
          .then((result) => new Promise((r) => setTimeout(() => r(result), 221)))
          .then((data: any) => {
            if (signal.aborted) return
            setTimelockedAddress(data.address)
            setIsLoadingTimelockAddress(false)
          })
          .catch((err) => {
            if (signal.aborted) return
            setAlert({ variant: 'danger', message: err.message })
            setIsLoadingTimelockAddress(false)
          })
      )
    },
    [wallet, t],
  )

  useEffect(() => {
    if (!lockDate) return
    const abortCtrl = new AbortController()
    loadTimeLockedAddress(lockDate, abortCtrl.signal)
    return () => abortCtrl.abort()
  }, [loadTimeLockedAddress, lockDate])

  const primaryButtonContent = useMemo(() => {
    if (isSending) {
      return (
        <>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('earn.fidelity_bond.renew.text_sending')}
        </>
      )
    } else if (txInfo) {
      return <>{t('global.done')}</>
    }
    return <>{t('earn.fidelity_bond.renew.text_button_submit')}</>
  }, [isSending, txInfo, t])

  const onSelectedDateChanged = useCallback((date) => {
    setTimelockedAddress(undefined)
    setLockDate(date ?? undefined)
  }, [])

  const modalBodyContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="d-flex justify-content-center align-items-center my-5">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          <div>{t(`earn.fidelity_bond.renew.${isSending ? 'text_sending' : 'text_loading'}`)}</div>
        </div>
      )
    }

    if (txInfo) {
      return (
        <div className="my-4">
          <Done text={t('earn.fidelity_bond.renew.success_text')} />
        </div>
      )
    }

    return (
      <div className="my-2 d-flex flex-column gap-4">
        <SelectDate
          description={t('earn.fidelity_bond.select_date.description')}
          yearsRange={yearsRange}
          disabled={isLoading || isLoadingTimelockedAddress}
          onChange={onSelectedDateChanged}
        />
        {timelockedAddress && (
          <>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex align-items-center gap-2">
                <CopyButton
                  text={<Sprite symbol="copy" width="18" height="18" />}
                  successText={<Sprite symbol="checkmark" width="18" height="18" />}
                  value={timelockedAddress}
                />
                <div className="d-flex flex-column">
                  <div>{t('earn.fidelity_bond.review_inputs.label_address')}</div>
                  <div>
                    <code>{timelockedAddress}</code>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }, [
    isLoading,
    isSending,
    yearsRange,
    timelockedAddress,
    isLoadingTimelockedAddress,
    txInfo,
    onSelectedDateChanged,
    t,
  ])

  const onPrimaryButtonClicked = async () => {
    if (isLoading) return
    if (isLoadingTimelockedAddress) return
    if (timelockedAddress === undefined) return
    if (waitForUtxosToBeSpent.length > 0) return

    if (txInfo) {
      onClose({ txInfo, mustReload: parentMustReload })
    } else if (!showConfirmSendModal) {
      setShowConfirmSendModal(true)
    } else {
      if (!fidelityBond || fb.utxo.isLocked(fidelityBond)) {
        throw new Error(t('earn.fidelity_bond.move.error_fidelity_bond_still_locked'))
      }
      setShowConfirmSendModal(false)
      setParentMustReload(true)

      setAlert(undefined)
      setIsSending(true)

      return sendFidelityBondToAddress({
        destination: timelockedAddress,
        fidelityBond,
        wallet,
        t,
      })
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
        dialogClassName={showConfirmSendModal ? 'invisible' : ''}
      >
        <rb.Modal.Header closeButton>
          <rb.Modal.Title>{t('earn.fidelity_bond.renew.title')}</rb.Modal.Title>
        </rb.Modal.Header>
        <rb.Modal.Body>
          {alert && <Alert {...alert} className="mt-0" onClose={() => setAlert(undefined)} />}
          {modalBodyContent}
        </rb.Modal.Body>
        <rb.Modal.Footer>
          <div className="w-100 d-flex gap-4 justify-content-center align-items-center">
            <rb.Button
              variant="light"
              disabled={isLoading}
              onClick={() => onClose({ txInfo, mustReload: parentMustReload })}
              className="flex-1 d-flex justify-content-center align-items-center"
            >
              {t('global.cancel')}
            </rb.Button>
            <rb.Button
              ref={submitButtonRef}
              variant="dark"
              className="flex-1 d-flex justify-content-center align-items-center"
              disabled={isLoading || timelockedAddress === undefined}
              onClick={onPrimaryButtonClicked}
            >
              {primaryButtonContent}
            </rb.Button>
          </div>
        </rb.Modal.Footer>
      </rb.Modal>
      {lockDate && fidelityBond && timelockedAddress !== undefined && (
        <PaymentConfirmModal
          isShown={showConfirmSendModal}
          title={t(`earn.fidelity_bond.renew.${timelockedAddress ? 'confirm_send_modal.title' : 'title'}`)}
          onCancel={() => {
            setShowConfirmSendModal(false)
            onClose({ txInfo, mustReload: parentMustReload })
          }}
          onConfirm={() => {
            submitButtonRef.current?.click()
          }}
          data={{
            sourceJarIndex: undefined, // dont show a source jar - might be confusing in this context
            destination: timelockedAddress,
            amount: fidelityBond.value,
            isSweep: true,
            isCoinjoin: false, // not sent as collaborative transaction
            numCollaborators: undefined,
            feeConfigValues,
            showPrivacyInfo: false,
          }}
        >
          <LockInfoAlert className="text-start mt-4" lockDate={lockDate} />
        </PaymentConfirmModal>
      )}
    </>
  )
}

type SpendFidelityBondModalProps = {
  fidelityBondId: Api.UtxoId
  wallet: CurrentWallet
  walletInfo: WalletInfo
  onClose: (result: Result) => void
  destinationJarIndex?: JarIndex
} & Omit<rb.ModalProps, 'onHide'>

const SpendFidelityBondModal = ({
  fidelityBondId,
  wallet,
  walletInfo,
  onClose,
  destinationJarIndex,
  ...modalProps
}: SpendFidelityBondModalProps) => {
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const feeConfigValues = useFeeConfigValues()[0]

  const [alert, setAlert] = useState<SimpleAlert>()
  const [selectedDestinationJarIndex, setSelectedDestinationJarIndex] = useState<JarIndex | undefined>(
    destinationJarIndex,
  )

  const [txInfo, setTxInfo] = useState<TxInfo | undefined>()
  const [waitForUtxosToBeSpent, setWaitForUtxosToBeSpent] = useState<Api.UtxoId[]>([])

  const [parentMustReload, setParentMustReload] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const isLoading = useMemo(() => isSending || waitForUtxosToBeSpent.length > 0, [isSending, waitForUtxosToBeSpent])

  const enableDestinationJarSelection = useMemo(() => destinationJarIndex === undefined, [destinationJarIndex])
  const [showConfirmSendModal, setShowConfirmSendModal] = useState(!enableDestinationJarSelection)

  const submitButtonRef = useRef<HTMLButtonElement>(null)

  const fidelityBond = useMemo(() => {
    return walletInfo.data.utxos.utxos.find((utxo) => utxo.utxo === fidelityBondId)
  }, [walletInfo, fidelityBondId])

  // This callback is responsible for updating the loading state when the
  // the payment is made. The wallet needs some time after a tx is sent
  // to reflect the changes internally. All outputs in
  // `waitForUtxosToBeSpent` must have been removed from the wallet
  // for the payment to be considered done.
  useEffect(() => {
    if (waitForUtxosToBeSpent.length === 0) return

    const abortCtrl = new AbortController()

    // Delaying the poll requests gives the wallet some time to synchronize
    // the utxo set and reduces amount of http requests
    const initialDelayInMs = 250
    const timer = setTimeout(() => {
      if (abortCtrl.signal.aborted) return

      reloadCurrentWalletInfo
        .reloadUtxos({ signal: abortCtrl.signal })
        .then((res) => {
          if (abortCtrl.signal.aborted) return

          const outputs = res.utxos.map((it) => it.utxo)
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
    if (selectedDestinationJarIndex === undefined) return
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

      sendFidelityBondToJar({
        fidelityBond,
        targetJarIndex: selectedDestinationJarIndex,
        wallet,
        t,
      })
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

  const primaryButtonContent = useMemo(() => {
    if (isSending) {
      return (
        <>
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('earn.fidelity_bond.move.text_sending')}
        </>
      )
    } else if (txInfo) {
      return <>{t('earn.fidelity_bond.move.text_button_done')}</>
    }
    return <>{t('earn.fidelity_bond.move.text_button_submit')}</>
  }, [isSending, txInfo, t])

  const ModalBodyContent = () => {
    if (isLoading) {
      return (
        <div className="d-flex justify-content-center align-items-center my-5">
          <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          <div>{t(`earn.fidelity_bond.move.${isSending ? 'text_sending' : 'text_loading'}`)}</div>
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
        totalBalance={walletInfo.balanceSummary.calculatedAvailableBalanceInSats}
        isJarSelectable={() => true}
        selectedJar={selectedDestinationJarIndex}
        onJarSelected={setSelectedDestinationJarIndex}
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
        dialogClassName={showConfirmSendModal ? 'invisible' : ''}
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
              className="flex-1 d-flex justify-content-center align-items-center"
            >
              {t('earn.fidelity_bond.move.text_button_cancel')}
            </rb.Button>
            <rb.Button
              ref={submitButtonRef}
              variant="dark"
              className="flex-1 d-flex justify-content-center align-items-center"
              disabled={isLoading || selectedDestinationJarIndex === undefined}
              onClick={onPrimaryButtonClicked}
            >
              {primaryButtonContent}
            </rb.Button>
          </div>
        </rb.Modal.Footer>
      </rb.Modal>
      {showConfirmSendModal && fidelityBond && selectedDestinationJarIndex !== undefined && (
        <PaymentConfirmModal
          size="lg"
          isShown={true}
          title={t(`earn.fidelity_bond.move.${enableDestinationJarSelection ? 'confirm_send_modal.title' : 'title'}`)}
          onCancel={() => {
            setShowConfirmSendModal(false)
            if (!enableDestinationJarSelection) {
              onClose({ txInfo, mustReload: parentMustReload })
            }
          }}
          onConfirm={() => {
            submitButtonRef.current?.click()
          }}
          data={{
            sourceJarIndex: undefined, // dont show a source jar - might be confusing in this context
            destination: String(
              t('send.confirm_send_modal.text_source_jar', { jarId: jarInitial(selectedDestinationJarIndex) }),
            ),
            amount: fidelityBond.value,
            isSweep: true,
            isCoinjoin: false, // not sent as collaborative transaction
            numCollaborators: undefined,
            feeConfigValues,
            showPrivacyInfo: false,
          }}
        />
      )}
    </>
  )
}

export { RenewFidelityBondModal, SpendFidelityBondModal }
