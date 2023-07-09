import { useState, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import * as Api from '../libs/JmWalletApi'
import { useTranslation } from 'react-i18next'
import { useServiceInfo } from '../context/ServiceInfoContext'
import PageTitle from './PageTitle'
import { CurrentWallet } from '../context/WalletContext'
import styles from './RescanChain.module.css'

interface RescanChainProps {
  wallet: CurrentWallet
}

export default function RescanChain({ wallet }: RescanChainProps) {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [isStartRescanning, setIsStartRescanning] = useState<boolean>(false)

  const startChainRescan = useCallback(
    async (signal: AbortSignal, { blockheight }: { blockheight: number }) => {
      setAlert(undefined)
      setIsStartRescanning(true)

      try {
        const requestContext = { walletName: wallet.name, token: wallet.token }
        const res = await Api.getRescanBlockchain({ signal, ...requestContext, blockheight })
        const success = await (res.ok ? true : Api.Helper.throwError(res))
        setIsStartRescanning(success)
      } catch (e: any) {
        if (signal.aborted) return
        setIsStartRescanning(false)
        const message = t('import_wallet.error_rescanning_failed', {
          reason: e.message || 'Unknown reason',
        })
        setAlert({ variant: 'danger', message })
      }
    },
    [wallet, setAlert, setIsStartRescanning, t]
  )

  return (
    <div className="import-wallet">
      <PageTitle title={t('rescan_chain.title')} subtitle={t('mnemonic_phrase.subtitle')} />
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      <>
        <>Your wallet has been imported.</>
        <>In order for it to find existing funds, you need to rescan the blockchain.</>

        <div>
          {serviceInfo?.rescanning ? (
            <>Rescan in progress...</>
          ) : (
            <>
              <rb.Button
                className={styles.submit}
                variant="dark"
                type="submit"
                onClick={() => {
                  const abortCtrl = new AbortController()

                  startChainRescan(abortCtrl.signal, {
                    blockheight: 0,
                  })
                }}
                disabled={isStartRescanning}
              >
                {isStartRescanning ? (
                  <>{t('rescan_chain.text_button_submitting')}</>
                ) : (
                  <>{t('rescan_chain.text_button_submit')}</>
                )}
              </rb.Button>
            </>
          )}
        </div>
      </>
    </div>
  )
}
