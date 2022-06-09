import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useServiceInfo } from '../context/ServiceInfoContext'
import { useLoadConfigValue } from '../context/ServiceConfigContext'
import {
  useCurrentWallet,
  useCurrentWalletInfo,
  useReloadCurrentWalletInfo,
  WalletInfo,
  Utxos,
  Account,
} from '../context/WalletContext'

// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'
// @ts-ignore
import PageTitle from './PageTitle'

import FidelityBondDetailsSetupForm from './fidelity_bond/FidelityBondDetailsSetupForm'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import { isFeatureEnabled } from '../constants/features'
import styles from './FidelityBond.module.css'

type AlertWithMessage = rb.AlertProps & { message: string }

type CoinControlSetupResult = {
  freeze: Api.UtxoId[]
  unfreeze: Api.UtxoId[]
}

const createCoinControlSetup = (walletInfo: WalletInfo, selectedUtxos: Utxos): CoinControlSetupResult => {
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

  return {
    freeze: eligibleForFreeze,
    unfreeze: eligibleForUnfreeze,
  }
}

/**
 * Prepare the sweep transaction creating a Fidelity Bond.
 * Steps:
 * - freeze all utxos except the selected ones
 * - unfreeze any frozen selected utxo
 * - return frozen utxo ids
 *
 * The returned utxos SHOULD be unfrozen by the caller
 * once the collaborative transaction finishes.
 *
 * @return list of utxo ids that were frozen.
 */
const prepareUtxosForSweep = async (
  requestContext: Api.WalletRequestContext,
  setup: CoinControlSetupResult
): Promise<Api.UtxoId[]> => {
  // sequentially perfom the freeze/unfreeze actions.
  // this should be very fast and will not unnecessarily freeze/unfreeze
  // utxos in case an error is triggered.
  // can be optimized, but keep in mind that there might be users
  // with a large amount of utxos, hence if you want to do requests in parallel
  // make sure to limit the number of concurrent requests
  const freezeActions = setup.freeze.map((utxo) => Api.postFreeze(requestContext, { utxo, freeze: true }))
  for (const freezeAction of freezeActions) {
    const res = await freezeAction
    if (!res.ok) await Api.Helper.throwError(res)
  }

  const unfreezeActions = setup.unfreeze.map((utxo) => Api.postFreeze(requestContext, { utxo, freeze: false }))
  for (const unfreezeAction of unfreezeActions) {
    const res = await unfreezeAction
    if (!res.ok) await Api.Helper.throwError(res)
  }

  return setup.freeze
}

type UtxoApiAction = {
  utxo: Api.UtxoId
  action: Promise<Response>
}

/**
 * Undo potential changes made to utxos freeze state.
 * Tries to continue in case of errors.
 *
 * @returns list of utxo ids for which the state could not be restored.
 */
const undoPrepareUtxosForSweep = async (
  requestContext: Api.WalletRequestContext,
  setup: CoinControlSetupResult
): Promise<Api.UtxoId[]> => {
  const reversedSetup = {
    freeze: setup.unfreeze,
    unfreeze: setup.freeze,
  }
  const failed: Api.UtxoId[] = []

  const freezeActions: UtxoApiAction[] = reversedSetup.freeze.map((utxo) => ({
    utxo,
    action: Api.postFreeze(requestContext, { utxo, freeze: true }),
  }))
  for (const freezeAction of freezeActions) {
    const response = await freezeAction.action
    if (!response.ok) {
      failed.push(freezeAction.utxo)
    }
  }

  const unfreezeActions: UtxoApiAction[] = reversedSetup.unfreeze.map((utxo) => ({
    utxo,
    action: Api.postFreeze(requestContext, { utxo, freeze: false }),
  }))
  for (const unfreezeAction of unfreezeActions) {
    const response = await unfreezeAction.action
    if (!response.ok) {
      failed.push(unfreezeAction.utxo)
    }
  }

  return failed
}

/**
 * Send funds to a timelocked address.
 * Defaults to sweep with a collaborative transaction.
 * If the selected utxo is a single expired FB, "diret-send" is used.
 *
 * The transaction will have no change output.
 */
const sweepToFidelityBond = async (
  requestContext: Api.WalletRequestContext,
  account: Account,
  utxos: Utxos,
  timelockedDestinationAddress: Api.BitcoinAddress,
  counterparties: number
): Promise<void> => {
  const amount_sats = 0 // sweep

  const useDirectSend = utxos.length === 1 && !!utxos[0].locktime
  if (useDirectSend) {
    await Api.postDirectSend(requestContext, {
      mixdepth: parseInt(account.account, 10),
      destination: timelockedDestinationAddress,
      amount_sats,
    }).then((res) => (res.ok ? true : Api.Helper.throwError(res)))
  } else {
    await Api.postCoinjoin(requestContext, {
      mixdepth: parseInt(account.account, 10),
      destination: timelockedDestinationAddress,
      amount_sats,
      counterparties,
    }).then((res) => (res.ok ? true : Api.Helper.throwError(res)))
  }
}

export default function FidelityBond() {
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
  const [createError, setCreateError] = useState<unknown | null>(null)
  const isCreateError = useMemo(() => createError !== null, [createError])
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
  const activeFidelityBonds = useMemo(
    () => (fidelityBonds === null ? null : fidelityBonds.filter((utxo) => utxo.frozen)),
    [fidelityBonds]
  )

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

      const coinControlSetup = createCoinControlSetup(currentWalletInfo, selectedUtxos)

      console.info(
        `Fidelity Bond Setup: Freezing ${coinControlSetup.freeze.length} utxos, unfreezing ${coinControlSetup.unfreeze.length} utxos`
      )

      try {
        const frozenUtxoIds = await prepareUtxosForSweep(requestContext, coinControlSetup)

        // TODO: consider storing utxo id hashes in local storage..
        // that way any changes can be reverted if a user leaves the page beofe the unfreezing happens
        setFrozenUtxoIds(frozenUtxoIds)

        // TODO: how many counterparties to use? is "minimum" for fbs okay?
        await sweepToFidelityBond(
          requestContext,
          selectedAccount,
          selectedUtxos,
          timelockedDestinationAddress,
          minimumMakers
        )
      } catch (error) {
        const unrestoredUtxos = await undoPrepareUtxosForSweep(requestContext, coinControlSetup)
        if (unrestoredUtxos.length !== 0) {
          // unfortunately, restore failed and there is nothing that can be done except informing the user
          // TODO: provide visual feedback, e.g. modal?
          console.warn(
            `Previous state of ${unrestoredUtxos.length} utxo(s) could not be restored and must be frozen/unfrozen manually.`
          )
        }
        throw error
      }

      setWaitForTakerToFinish(true)
      setIsCreateSuccess(true)
    } catch (error) {
      setCreateError(error)
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
    <div className={styles['fidelity-bond']}>
      <PageTitle title={t('fidelity_bond.title')} subtitle={t('fidelity_bond.subtitle')} />

      <div className="mb-4">
        <Trans i18nKey="fidelity_bond.description">
          <a
            href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-secondary"
          >
            See the documentation about Fidelity Bonds
          </a>{' '}
          for more information.
        </Trans>
      </div>

      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}

      <div>
        {isInitializing || isLoading ? (
          <div className="d-flex justify-content-center align-items-center">
            <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
            {t('global.loading')}
          </div>
        ) : (
          <>
            {currentWallet && currentWalletInfo && activeFidelityBonds && activeFidelityBonds.length === 0 && (
              <>
                {waitForTakerToFinish || isCreateSuccess || isCreateError ? (
                  <>
                    {waitForTakerToFinish ? (
                      <>
                        <div className="d-flex justify-content-center align-items-center">
                          <rb.Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                          <Trans i18nKey="fidelity_bond.transaction_in_progress_loading_text">
                            Creating Fidelity Bond…
                          </Trans>
                        </div>
                        <div className="d-flex justify-content-center">
                          <small>
                            <Trans i18nKey="fidelity_bond.transaction_in_progress_patience_text">
                              Please be patient, this will take several minutes.
                            </Trans>
                          </small>
                        </div>
                      </>
                    ) : (
                      <>
                        {isCreateSuccess && (
                          <div className="d-flex justify-content-center align-items-center">Success!</div>
                        )}
                        {isCreateError && (
                          <div className="d-flex justify-content-center align-items-center">Error!</div>
                        )}
                      </>
                    )}
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

            {activeFidelityBonds && activeFidelityBonds.length > 0 && (
              <div className="mt-2 mb-4">
                <h5>{t('current_wallet_advanced.title_fidelity_bonds')}</h5>
                <DisplayUTXOs utxos={activeFidelityBonds} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
