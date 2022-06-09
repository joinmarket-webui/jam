import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import {
  useCurrentWallet,
  useCurrentWalletInfo,
  useReloadCurrentWalletInfo,
  WalletInfo,
  CurrentWallet,
  Utxos,
  Account,
} from '../context/WalletContext'
import { useServiceInfo } from '../context/ServiceInfoContext'

// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'

import * as Api from '../libs/JmWalletApi'
import FidelityBondDetailsSetupForm from './fidelity_bond/FidelityBondDetailsSetupForm'
import { useLoadConfigValue } from '../context/ServiceConfigContext'

type AlertWithMessage = rb.AlertProps & { message: string }

/**
 * - freeze all utxos except the selected ones
 * - unfreeze any frozen selected utxo
 * - return frozen utxo ids
 *
 * The returned utxos SHOULD be unfrozen by the caller
 * once the collaborative transaction finishes.
 *
 * @return list of utxo ids that were automatically frozen
 */
const prepareFidelityBondSweepTransaction = async (
  requestContext: Api.WalletRequestContext,
  walletInfo: WalletInfo,
  selectedUtxos: Utxos
): Promise<Api.UtxoId[]> => {
  const selectedMixdepth = selectedUtxos[0].mixdepth

  // sanity check
  const sameAccountCheck = selectedUtxos.every((it) => it.mixdepth === selectedMixdepth)
  if (!sameAccountCheck) {
    throw new Error('Given utxos must be from the same account')
  }

  const allUtxosInAccount = walletInfo.data.utxos.utxos.filter((it) => it.mixdepth === selectedMixdepth)

  const otherUtxos = allUtxosInAccount.filter((it) => !selectedUtxos.includes(it))
  const eligibleForFreeze = otherUtxos.filter((it) => !it.frozen).map((it) => it.utxo)
  const eligibleForUnfreeze = selectedUtxos.filter((it) => it.frozen).map((it) => it.utxo)

  const freezePromises = eligibleForFreeze.map((utxo) => Api.postFreeze(requestContext, { utxo, freeze: true }))
  const unfreezePromises = eligibleForUnfreeze.map((utxo) => Api.postFreeze(requestContext, { utxo, freeze: false }))

  console.debug(`Freezing ${eligibleForFreeze.length} utxos in account ${selectedMixdepth}`, eligibleForFreeze)
  await Promise.all(freezePromises)

  console.debug(`Unfreeze ${eligibleForFreeze.length} utxos in account ${selectedMixdepth}`, eligibleForUnfreeze)
  await Promise.all(unfreezePromises)

  return eligibleForFreeze
}

/**
 * Send funds to a timelocked address with a collaborative sweep transactions.
 * The transaction will have no change output.
 */
const sweepToFidelityBond = async (
  requestContext: Api.WalletRequestContext,
  account: Account,
  timelockedDestinationAddress: Api.BitcoinAddress,
  counterparties: number
): Promise<Response> => {
  return await Api.postCoinjoin(requestContext, {
    mixdepth: parseInt(account.account, 10),
    destination: timelockedDestinationAddress,
    amount_sats: 0, // sweep
    counterparties,
  })
}

export const FidelityBondSimple = () => {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const currentWalletInfo = useCurrentWalletInfo()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()
  const loadConfigValue = useLoadConfigValue()

  const isCoinjoinInProgress = useMemo(() => serviceInfo && serviceInfo.coinjoinInProgress, [serviceInfo])
  const isMakerRunning = useMemo(() => serviceInfo && serviceInfo.makerRunning, [serviceInfo])

  const [alert, setAlert] = useState<AlertWithMessage | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isCreateSuccess, setIsCreateSuccess] = useState(false)
  const [isCreateError, setIsCreateError] = useState(false)
  const [frozenUtxoIds, setFrozenUtxoIds] = useState<Api.UtxoId[] | null>(null)

  const [waitForTakerToFinish, setWaitForTakerToFinish] = useState(false)

  useEffect(() => {
    if (isCreating) return
    if (!isCreateSuccess && !isCreateError) return
    if (isCoinjoinInProgress === null) return

    setWaitForTakerToFinish(isCoinjoinInProgress)
  }, [isCreating, isCreateSuccess, isCreateError, isCoinjoinInProgress])

  const utxos = useMemo(
    () => (currentWalletInfo === null ? [] : currentWalletInfo.data.utxos.utxos),
    [currentWalletInfo]
  )
  const fidelityBonds = useMemo(() => (utxos === null ? null : utxos.filter((utxo) => utxo.locktime)), [utxos])

  useEffect(() => {
    if (!currentWallet) {
      setAlert({ variant: 'danger', message: t('current_wallet.error_loading_failed') })
      setIsLoading(false)
      setIsInitializing(false)
      return
    }

    const abortCtrl = new AbortController()

    setAlert(null)
    setIsLoading(true)

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .catch((err) => {
        const message = err.message || t('current_wallet.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => {
        if (abortCtrl.signal.aborted) return

        setIsLoading(false)
        setIsInitializing(false)
      })

    return () => abortCtrl.abort()
  }, [currentWallet, reloadCurrentWalletInfo, t])

  useEffect(() => {
    if (!isCreateSuccess && !isCreateError) return
    if (waitForTakerToFinish) return

    const abortCtrl = new AbortController()
    setIsLoading(true)

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .catch((err) => {
        const message = err.message || t('current_wallet.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [waitForTakerToFinish, isCreateSuccess, isCreateError, reloadCurrentWalletInfo, t])

  /**
   * Unfreeze any utxo that has been frozen before the
   * broadcasting the collaborative sweep transaction.
   */
  useEffect(() => {
    if (!isLoading) return
    if (!currentWallet) return
    if (waitForTakerToFinish) return
    if (!isCreateSuccess && !isCreateError) return
    if (frozenUtxoIds === null || frozenUtxoIds.length === 0) return

    const { name: walletName, token } = currentWallet

    const unfreezePromises = frozenUtxoIds.map((utxoId) => {
      return Api.postFreeze({ walletName, token }, { utxo: utxoId, freeze: false })
    })

    const abortCtrl = new AbortController()
    setIsLoading(true)

    Promise.all(unfreezePromises)
      .catch((err) => {
        if (abortCtrl.signal.aborted) return

        const message = err.message || t('fidelity_bond.error_while_unfreezing_utxos')
        setAlert({ variant: 'danger', message })
      })
      .finally(() => {
        if (abortCtrl.signal.aborted) return

        setIsLoading(false)

        // reset the utxos regardless of success or error.
        // there is generally nothing that can be done if the call does not success.
        // otherwise this results in endlessly trying to unfreeze the utxos
        setFrozenUtxoIds(null)
      })

    return () => abortCtrl.abort()
  }, [isLoading, waitForTakerToFinish, isCreateSuccess, isCreateError, frozenUtxoIds, currentWallet, t])

  const onSubmit = async (
    selectedAccount: Account,
    selectedUtxos: Utxos,
    selectedLockdate: Api.Lockdate,
    timelockedDestinationAddress: Api.BitcoinAddress
  ) => {
    if (isCreating) return
    if (!currentWallet) return
    if (!currentWalletInfo) return
    if (selectedUtxos.length === 0) return

    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet
    const requestContext = { walletName, token, signal: abortCtrl.signal }

    setIsCreating(true)
    try {
      const minimumMakers = await loadConfigValue({
        signal: abortCtrl.signal,
        key: { section: 'POLICY', field: 'minimum_makers' },
      }).then((data) => parseInt(data.value, 10))

      const frozenUtxoIds = await prepareFidelityBondSweepTransaction(requestContext, currentWalletInfo, selectedUtxos)

      // TODO: consider storing utxo id hashes in local storage..
      // that way any changes can be reverted if a user leaves the page beofe the unfreezing happens
      setFrozenUtxoIds(frozenUtxoIds)

      // TODO: how many counterparties to use? is "minimum" for fbs okay?
      await sweepToFidelityBond(requestContext, selectedAccount, timelockedDestinationAddress, minimumMakers)

      setWaitForTakerToFinish(true)
      setIsCreateSuccess(true)
    } catch (error) {
      setIsCreateError(true)
      throw error
    } finally {
      setIsCreating(false)
    }
  }

  // TODO: use alert like in other screens
  if (isMakerRunning) {
    return <>Creating Fidelity Bonds is temporarily disabled: Earn is active.</>
  }
  if (!waitForTakerToFinish && isCoinjoinInProgress) {
    return <>Creating Fidelity Bonds is temporarily disabled: A collaborative transaction is in progress.</>
  }

  return (
    <div>
      {isInitializing || isLoading ? (
        <div className="d-flex justify-content-center align-items-center">
          <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
          {t('global.loading')}
        </div>
      ) : (
        <>
          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

          {currentWallet && currentWalletInfo && fidelityBonds && fidelityBonds.length === 0 && (
            <>
              {waitForTakerToFinish || isCreateSuccess || isCreateError ? (
                <>
                  <>
                    {waitForTakerToFinish ? (
                      <div className="d-flex justify-content-center align-items-center">
                        <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                        {t('fidelity_bond.transaction_in_progress')}
                      </div>
                    ) : (
                      <>
                        <>
                          {isCreateSuccess && (
                            <div className="d-flex justify-content-center align-items-center">Success!</div>
                          )}
                          {isCreateError && (
                            <div className="d-flex justify-content-center align-items-center">Error!</div>
                          )}
                        </>
                      </>
                    )}
                  </>
                </>
              ) : (
                <FidelityBondDetailsSetupForm
                  currentWallet={currentWallet}
                  walletInfo={currentWalletInfo}
                  onSubmit={onSubmit}
                />
              )}
            </>
          )}

          {fidelityBonds && fidelityBonds.length > 0 && (
            <>
              {fidelityBonds.length > 0 && (
                <div className="mt-2 mb-4">
                  <h5>{t('current_wallet_advanced.title_fidelity_bonds')}</h5>
                  <DisplayUTXOs utxos={fidelityBonds} />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
