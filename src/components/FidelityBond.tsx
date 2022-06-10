import React, { useEffect, useMemo, useState } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'

import { useServiceInfo } from '../context/ServiceInfoContext'
import { useLoadConfigValue } from '../context/ServiceConfigContext'
import { useCurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo, Account } from '../context/WalletContext'

// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'
// @ts-ignore
import PageTitle from './PageTitle'

import FidelityBondDetailsSetupForm from './fidelity_bond/FidelityBondDetailsSetupForm'
import * as Api from '../libs/JmWalletApi'
import styles from './FidelityBond.module.css'

type AlertWithMessage = rb.AlertProps & { message: string }

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
  timelockedDestinationAddress: Api.BitcoinAddress,
  counterparties: number
): Promise<void> => {
  const amount_sats = 0 // sweep

  await Api.postCoinjoin(requestContext, {
    mixdepth: parseInt(account.account, 10),
    destination: timelockedDestinationAddress,
    amount_sats,
    counterparties,
  }).then((res) => (res.ok ? true : Api.Helper.throwError(res)))
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
    if (isCreating) return
    if (waitForTakerToFinish) return
    if (!isCreateSuccess && !isCreateError) return

    const abortCtrl = new AbortController()
    setIsLoading(true)

    reloadCurrentWalletInfo({ signal: abortCtrl.signal })
      .catch((err) => {
        const message = err.message || t('current_wallet.error_loading_failed')
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message })
      })
      .finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [waitForTakerToFinish, isCreating, isCreateSuccess, isCreateError, reloadCurrentWalletInfo, t])

  const onSubmit = async (
    selectedAccount: Account,
    selectedLockdate: Api.Lockdate,
    timelockedDestinationAddress: Api.BitcoinAddress
  ) => {
    if (isCreating) return
    if (!currentWallet) return
    if (!currentWalletInfo) return

    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet
    const requestContext = { walletName, token, signal: abortCtrl.signal }

    setIsCreating(true)
    try {
      const minimumMakers = await loadConfigValue({
        signal: abortCtrl.signal,
        key: { section: 'POLICY', field: 'minimum_makers' },
      }).then((data) => parseInt(data.value, 10))

      // TODO: how many counterparties to use? is "minimum" for fbs okay?
      await sweepToFidelityBond(requestContext, selectedAccount, timelockedDestinationAddress, minimumMakers)
      setIsCreateSuccess(true)
      setWaitForTakerToFinish(true)
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
                        <rb.Alert variant="info" className="my-4">
                          {t('send.text_coinjoin_already_running')}
                        </rb.Alert>
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
