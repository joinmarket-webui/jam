import { useState, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import * as Api from '../libs/JmWalletApi'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useServiceInfo } from '../context/ServiceInfoContext'
import PageTitle from './PageTitle'
import WalletCreationForm from './WalletCreationForm'
import MnemonicWordInput from './MnemonicWordInput'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import { routes } from '../constants/routes'
import { walletDisplayName } from '../utils'
import styles from './ImportWallet.module.css'

const fillerMnemonicPhrase =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const MnemonicPhraseInputForm = ({ onSubmit }: { onSubmit: (mnemonicPhrase: string) => void }) => {
  const { t } = useTranslation()
  const [mnemonicPhraseWords, setMnemonicPhraseWords] = useState(new Array<string>(12).fill(''))
  const [showFillerButton] = useState(isDebugFeatureEnabled('importFillerMnemonicPhrase'))

  const isMnemonicPhraseValid = useMemo(() => mnemonicPhraseWords.every((it) => it.length > 0), [mnemonicPhraseWords])
  return (
    <div>
      <rb.Form noValidate>
        <div className="container slashed-zeroes p-0">
          {mnemonicPhraseWords.map((_, outerIndex) => {
            if (outerIndex % 2 !== 0) return null

            const seedWords = mnemonicPhraseWords.slice(outerIndex, outerIndex + 2)

            return (
              <div className="row mb-4" key={outerIndex}>
                {seedWords.map((givenWord, innerIndex) => {
                  const wordIndex = outerIndex + innerIndex
                  return (
                    <div className="col" key={wordIndex}>
                      <MnemonicWordInput
                        index={wordIndex}
                        value={givenWord}
                        setValue={(value) =>
                          setMnemonicPhraseWords((words) =>
                            words.map((old, index) => (index === wordIndex ? value : old))
                          )
                        }
                        isValid={undefined}
                        disabled={false}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </rb.Form>

      <rb.Button
        variant="dark"
        className={styles.button}
        onClick={() => {
          if (isMnemonicPhraseValid) {
            onSubmit(mnemonicPhraseWords.join(' '))
          }
        }}
        disabled={!isMnemonicPhraseValid}
      >
        {t('import_wallet.mnemonic_phrase.text_button_submit')}
      </rb.Button>

      <div className="d-flex mt-4 mb-4 gap-4">
        {/*<rb.Button
          variant="outline-dark"
          disabled={false}
          className={styles.button}
          onClick={() => {
            // parentStepSetter()
          }}
        >
          {t('create_wallet.back_button')}
        </rb.Button>*/}

        {showFillerButton && (
          <rb.Button
            variant="outline-dark"
            className={styles.button}
            onClick={() => {
              setMnemonicPhraseWords(fillerMnemonicPhrase.split(' '))
            }}
            disabled={false}
          >
            {t('import_wallet.fill_with')}
          </rb.Button>
        )}
      </div>
    </div>
  )
}

interface ImportWalletProps {
  startWallet: (name: Api.WalletName, token: Api.ApiToken) => void
}

export default function ImportWallet({ startWallet }: ImportWalletProps) {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [walletNameAndPassword, setWalletNameAndPassword] = useState<{ name: string; password: string }>()
  const [mnemonicPhrase, setMnemonicPhrase] = useState<string>()
  const [recoveredWallet, setRecoveredWallet] = useState<{ walletFileName: Api.WalletName; token: Api.ApiToken }>()
  const [isRecovering, setIsRecovering] = useState<boolean>(false)
  const [isStartRescanning, setIsStartRescanning] = useState<boolean>(false)

  const isRecovered = useMemo(() => !!recoveredWallet?.walletFileName && recoveredWallet?.token, [recoveredWallet])
  const canRecover = useMemo(() => !isRecovered && !serviceInfo?.walletName, [isRecovered, serviceInfo])

  const recoverWallet = useCallback(
    async (
      signal: AbortSignal,
      { walletname, password, seedphrase }: { walletname: Api.WalletName; password: string; seedphrase: string }
    ) => {
      setAlert(undefined)
      setIsRecovering(true)

      try {
        const res = await Api.postWalletRecover({ signal }, { walletname, password, seedphrase })
        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))

        const { walletname: importedWalletFileName, token } = body
        setRecoveredWallet({ walletFileName: importedWalletFileName, token })
        startWallet(importedWalletFileName, token)
      } catch (e: any) {
        if (signal.aborted) return
        const message = t('import_wallet.error_importing_failed', {
          reason: e.message || 'Unknown reason',
        })
        setAlert({ variant: 'danger', message })
      } finally {
        setIsRecovering(false)
      }
    },
    [setAlert, setRecoveredWallet, setIsRecovering, t]
  )

  const startChainRescan = useCallback(
    async (
      signal: AbortSignal,
      { walletFileName, token, blockheight }: { walletFileName: Api.WalletName; token: string; blockheight: number }
    ) => {
      setAlert(undefined)
      setIsStartRescanning(true)

      try {
        const res = await Api.getRescanBlockchain({ signal, token, walletName: walletFileName, blockheight })
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
    [setAlert, setIsStartRescanning, t]
  )

  const step = useMemo(() => {
    if (!walletNameAndPassword) return 'input-wallet-details'
    if (!mnemonicPhrase) return 'input-mnemonic-phrase'
    if (!recoveredWallet) return 'input-confirmation'
    return 'start-rescan'
  }, [walletNameAndPassword, mnemonicPhrase, recoveredWallet])

  return (
    <div className="import-wallet">
      {step === 'input-wallet-details' && <PageTitle title={t('import_wallet.wallet_details.title')} />}
      {step === 'input-mnemonic-phrase' && (
        <PageTitle
          title={t('import_wallet.mnemonic_phrase.title')}
          subtitle={t('import_wallet.mnemonic_phrase.subtitle')}
        />
      )}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {(canRecover || isRecovered) && (
        <>
          {step === 'input-wallet-details' && (
            <WalletCreationForm
              onSubmit={async (name, password) => setWalletNameAndPassword({ name, password })}
              submitButtonText={(isSubmitting) => (
                <>
                  {t(
                    isSubmitting
                      ? 'import_wallet.wallet_details.text_button_submitting'
                      : 'import_wallet.wallet_details.text_button_submit'
                  )}
                </>
              )}
            />
          )}
          {step === 'input-mnemonic-phrase' && (
            <MnemonicPhraseInputForm
              onSubmit={(mnemonicPhrase) => {
                setMnemonicPhrase(mnemonicPhrase)
              }}
            />
          )}
          {step === 'input-confirmation' && (
            <>
              <>Review your inputs</>
              <rb.Button
                variant="outline-dark"
                className={styles.button}
                onClick={() => {
                  const abortCtrl = new AbortController()

                  recoverWallet(abortCtrl.signal, {
                    walletname: walletNameAndPassword?.name! as Api.WalletName,
                    password: walletNameAndPassword?.password!,
                    seedphrase: mnemonicPhrase!,
                  })
                }}
                disabled={isRecovering}
              >
                {isRecovering ? (
                  <>{t('import_wallet.confirmation.text_button_submitting')}</>
                ) : (
                  <>{t('import_wallet.confirmation.text_button_submit')}</>
                )}
              </rb.Button>
            </>
          )}
          {step === 'start-rescan' && (
            <>
              <>Your wallet has been imported.</>
              <>In order for it to find existing funds, you need to rescan the blockchain.</>

              <>
                {serviceInfo?.rescanning ? (
                  <>
                    <>Rescan in progress...</>
                  </>
                ) : (
                  <>
                    <rb.Button
                      variant="outline-dark"
                      className={styles.button}
                      onClick={() => {
                        const abortCtrl = new AbortController()

                        startChainRescan(abortCtrl.signal, {
                          ...recoveredWallet!,
                          blockheight: 0,
                        })
                      }}
                      disabled={isStartRescanning}
                    >
                      {isStartRescanning ? (
                        <>{t('import_wallet.rescan.text_button_submitting')}</>
                      ) : (
                        <>{t('import_wallet.rescan.text_button_submit')}</>
                      )}
                    </rb.Button>
                  </>
                )}
              </>
            </>
          )}
        </>
      )}
      {!canRecover && !isRecovered && serviceInfo?.walletName && (
        <rb.Alert variant="warning">
          <Trans i18nKey="create_wallet.alert_other_wallet_unlocked">
            Currently <strong>{{ walletName: walletDisplayName(serviceInfo.walletName) }}</strong> is active. You need
            to lock it first.
            <Link to={routes.walletList} className="alert-link">
              Go back
            </Link>
            .
          </Trans>
        </rb.Alert>
      )}
    </div>
  )
}
