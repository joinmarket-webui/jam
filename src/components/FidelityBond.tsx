import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'

import { useServiceInfo } from '../context/ServiceInfoContext'
import { useLoadConfigValue } from '../context/ServiceConfigContext'
import { useCurrentWallet, useCurrentWalletInfo, useReloadCurrentWalletInfo, Account } from '../context/WalletContext'

import Sprite from './Sprite'
// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'
// @ts-ignore
import PageTitle from './PageTitle'

import FidelityBondDetailsSetupForm from './fidelity_bond/FidelityBondDetailsSetupForm'
import * as Api from '../libs/JmWalletApi'
import { isLocked } from '../hooks/BalanceSummary'
import { routes } from '../constants/routes'
import styles from './FidelityBond.module.css'

type AlertWithMessage = rb.AlertProps & { message: string }

const collaborativeSweepToFidelityBond = async (
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

const directSweepToFidelityBond = async (
  requestContext: Api.WalletRequestContext,
  account: Account,
  timelockedDestinationAddress: Api.BitcoinAddress
) => {
  const amount_sats = 0 // sweep

  await Api.postDirectSend(requestContext, {
    mixdepth: parseInt(account.account, 10),
    destination: timelockedDestinationAddress,
    amount_sats,
  }).then((res) => (res.ok ? true : Api.Helper.throwError(res)))
}

const MakerIsRunningAlert = () => {
  const { t } = useTranslation()
  return (
    <Link to={routes.earn} className="unstyled">
      <rb.Alert variant="info" className="mb-4">
        <rb.Row className="align-items-center">
          <rb.Col>{t('fidelity_bond.text_maker_running')}</rb.Col>
          <rb.Col xs="auto">
            <Sprite symbol="caret-right" width="24px" height="24px" />
          </rb.Col>
        </rb.Row>
      </rb.Alert>
    </Link>
  )
}

const TakerIsRunningAlert = () => {
  const { t } = useTranslation()
  return (
    <rb.Alert variant="info" className="mb-4">
      {t('fidelity_bond.text_coinjoin_already_running')}
    </rb.Alert>
  )
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
  const isOperationDisabled = useMemo(
    () => isMakerRunning || isCoinjoinInProgress,
    [isMakerRunning, isCoinjoinInProgress]
  )

  const [alert, setAlert] = useState<AlertWithMessage | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isInitiateTxSuccess, setIsInitiateTxSuccess] = useState(false)
  const [initiateTxError, setInitiateTxError] = useState<unknown>(undefined)
  const isInitiateTxError = useMemo(() => initiateTxError !== undefined, [initiateTxError])

  const utxos = useMemo(() => currentWalletInfo?.data.utxos.utxos, [currentWalletInfo])
  const fidelityBonds = useMemo(() => utxos?.filter((utxo) => utxo.locktime), [utxos])
  const activeFidelityBonds = useMemo(() => fidelityBonds?.filter((it) => isLocked(it)), [fidelityBonds])

  useEffect(() => {
    if (!currentWallet) {
      setAlert({ variant: 'danger', message: t('current_wallet.error_loading_failed') })
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

  /**
   * Initiate sending funds to a timelocked address.
   * Defaults to sweep with a collaborative transaction.
   * If the selected utxo is a single expired FB, "diret-send" is used.
   *
   * The transaction will have no change output.
   */
  const onSubmit = async (
    selectedAccount: Account,
    selectedLockdate: Api.Lockdate,
    timelockedDestinationAddress: Api.BitcoinAddress
  ) => {
    if (isSending) return
    if (!currentWallet) return
    if (!utxos) return

    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet
    const requestContext = { walletName, token, signal: abortCtrl.signal }

    setIsSending(true)
    try {
      const accountIndex = parseInt(selectedAccount.account, 10)
      const usedUtxos = utxos
        .filter((it) => it.mixdepth === accountIndex)
        .filter((it) => !it.frozen)
        .filter((it) => !isLocked(it))

      // ff the selected utxo is a single expired FB, send via "direct-send"
      const useDirectSend = usedUtxos.length === 1 && !!usedUtxos[0].locktime && !isLocked(usedUtxos[0])

      if (useDirectSend) {
        await directSweepToFidelityBond(requestContext, selectedAccount, timelockedDestinationAddress)
      } else {
        const minimumMakers = await loadConfigValue({
          signal: abortCtrl.signal,
          key: { section: 'POLICY', field: 'minimum_makers' },
        }).then((data) => parseInt(data.value, 10))

        // TODO: how many counterparties to use? is "minimum" for fbs okay?
        await collaborativeSweepToFidelityBond(
          requestContext,
          selectedAccount,
          timelockedDestinationAddress,
          minimumMakers
        )
      }
      setIsInitiateTxSuccess(true)
    } catch (error) {
      setInitiateTxError(error)
      throw error
    } finally {
      setIsSending(false)
    }
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
            {currentWallet && currentWalletInfo && serviceInfo && activeFidelityBonds && (
              <>
                {isInitiateTxSuccess || isInitiateTxError ? (
                  <>
                    {isInitiateTxSuccess ? (
                      <>
                        <rb.Alert variant="success" className="my-4">
                          The transaction to create your Fidelity Bond has been successfully initiated.
                        </rb.Alert>
                        {isCoinjoinInProgress && <TakerIsRunningAlert />}
                      </>
                    ) : (
                      <rb.Alert variant="danger" className="my-4">
                        Error while initiating your Fidelity Bond transaction.
                      </rb.Alert>
                    )}
                  </>
                ) : (
                  <>
                    {isOperationDisabled ? (
                      <rb.Fade in={isOperationDisabled} mountOnEnter={true} unmountOnExit={true}>
                        <>
                          {isMakerRunning && <MakerIsRunningAlert />}
                          {isCoinjoinInProgress && <TakerIsRunningAlert />}
                        </>
                      </rb.Fade>
                    ) : (
                      <>
                        {activeFidelityBonds.length === 0 ? (
                          <FidelityBondDetailsSetupForm
                            currentWallet={currentWallet}
                            walletInfo={currentWalletInfo}
                            onSubmit={onSubmit}
                          />
                        ) : (
                          <div className="mt-2 mb-4">
                            <h5>{t('current_wallet_advanced.title_fidelity_bonds')}</h5>
                            <DisplayUTXOs utxos={activeFidelityBonds} />
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
