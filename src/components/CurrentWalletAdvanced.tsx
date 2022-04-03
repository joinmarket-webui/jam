import React, { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import DisplayAccounts from './DisplayAccounts'
// @ts-ignore
import DisplayAccountUTXOs from './DisplayAccountUTXOs'
// @ts-ignore
import DisplayUTXOs from './DisplayUTXOs'
// @ts-ignore
import { useCurrentWallet, useCurrentWalletInfo, useSetCurrentWalletInfo } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'
import { LoadingAccounts } from './LoadingAccounts'

type Utxos = any[]
type Alert = { message: string; variant: string }

export default function CurrentWalletAdvanced() {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const walletInfo = useCurrentWalletInfo()
  const setWalletInfo = useSetCurrentWalletInfo()
  const [fidelityBonds, setFidelityBonds] = useState<Utxos | null>(null)
  const [utxos, setUtxos] = useState<Utxos | null>(null)
  const [showUTXO, setShowUTXO] = useState(false)
  const [alert, setAlert] = useState<Alert | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!currentWallet) {
      setAlert({ variant: 'danger', message: t('current_wallet.error_loading_failed') })
      setIsLoading(false)
      return
    }

    const abortCtrl = new AbortController()
    const { name: walletName, token } = currentWallet

    const setUtxoData = (utxos: Utxos) => {
      setUtxos(utxos)
      setFidelityBonds(utxos.filter((utxo) => utxo.locktime))
    }

    setAlert(null)
    setIsLoading(true)

    const loadingWallet = Api.getWalletDisplay({ walletName, token, signal: abortCtrl.signal })
      .then((res) => (res.ok ? res.json() : Api.Helper.throwError(res, t('current_wallet.error_loading_failed'))))
      .then((data) => setWalletInfo(data.walletinfo))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    const loadingUtxos = Api.getWalletUtxos({ walletName, token, signal: abortCtrl.signal })
      .then(
        (res): Promise<{ utxos: Utxos }> =>
          res.ok ? res.json() : Api.Helper.throwError(res, t('current_wallet_advanced.error_loading_utxos_failed'))
      )
      .then((data) => setUtxoData(data.utxos))
      .catch((err) => {
        !abortCtrl.signal.aborted && setAlert({ variant: 'danger', message: err.message })
      })

    Promise.all([loadingWallet, loadingUtxos]).finally(() => !abortCtrl.signal.aborted && setIsLoading(false))

    return () => abortCtrl.abort()
  }, [currentWallet, setWalletInfo, t])

  return (
    <div>
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {isLoading && <LoadingAccounts amount={5} />}
      {!isLoading && walletInfo && <DisplayAccounts accounts={walletInfo.accounts} className="mb-4" />}
      {!!fidelityBonds?.length && (
        <div className="mt-5 mb-3 pe-3">
          <h5>{t('current_wallet_advanced.title_fidelity_bonds')}</h5>
          <DisplayUTXOs utxos={fidelityBonds} className="pe-2" />
        </div>
      )}
      <>
        <rb.Button
          variant="outline-dark"
          disabled={isLoading}
          onClick={() => {
            setShowUTXO(!showUTXO)
          }}
          className={isLoading ? 'mt-3 mb-3' : 'mb-3'}
        >
          {showUTXO ? t('current_wallet_advanced.button_hide_utxos') : t('current_wallet_advanced.button_show_utxos')}
        </rb.Button>
        <rb.Fade in={showUTXO} mountOnEnter={true} unmountOnExit={true}>
          <div>
            {utxos && utxos.length === 0 ? (
              <rb.Alert variant="info">{t('current_wallet_advanced.alert_no_utxos')}</rb.Alert>
            ) : (
              <DisplayAccountUTXOs utxos={utxos} className="mt-3" />
            )}
          </div>
        </rb.Fade>
      </>
    </div>
  )
}
