import { useState, useMemo, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import * as Api from '../libs/JmWalletApi'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { useServiceInfo } from '../context/ServiceInfoContext'
import { ConfigKey, useUpdateConfigValues } from '../context/ServiceConfigContext'
import PageTitle from './PageTitle'
import WalletCreationForm from './WalletCreationForm'
import MnemonicWordInput from './MnemonicWordInput'
import WalletCreationConfirmation from './WalletCreationConfirmation'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import { routes } from '../constants/routes'
import { DUMMY_MNEMONIC_PHRASE, JM_WALLET_FILE_EXTENSION, walletDisplayName } from '../utils'
import styles from './ImportWallet.module.css'

const GAPLIMIT_CONFIGKEY: ConfigKey = {
  section: 'POLICY',
  field: 'gaplimit',
}

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
            onClick={() => setMnemonicPhraseWords(DUMMY_MNEMONIC_PHRASE.split(' '))}
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
  const navigate = useNavigate()
  const serviceInfo = useServiceInfo()
  const updateConfigValues = useUpdateConfigValues()

  const [alert, setAlert] = useState<SimpleAlert>()
  const [walletNameAndPassword, setWalletNameAndPassword] = useState<{ name: string; password: string }>()
  const [mnemonicPhrase, setMnemonicPhrase] = useState<string>()
  const [gaplimit, setGaplimit] = useState<number>(205)
  const [startBlockheight, setStartBlockheight] = useState<number>(0)
  const [recoveredWallet, setRecoveredWallet] = useState<{ walletFileName: Api.WalletName; token: Api.ApiToken }>()

  const isRecovered = useMemo(() => !!recoveredWallet?.walletFileName && recoveredWallet?.token, [recoveredWallet])
  const canRecover = useMemo(() => !isRecovered && !serviceInfo?.walletName, [isRecovered, serviceInfo])

  const recoverWallet = useCallback(
    async (
      signal: AbortSignal,
      {
        walletname,
        password,
        seedphrase,
        gaplimit,
        blockheight,
      }: { walletname: Api.WalletName; password: string; seedphrase: string; gaplimit: number; blockheight: number }
    ) => {
      setAlert(undefined)

      try {
        // Step #1: recover wallet
        const recoverResponse = await Api.postWalletRecover({ signal }, { walletname, password, seedphrase })
        const recoverBody = await (recoverResponse.ok ? recoverResponse.json() : Api.Helper.throwError(recoverResponse))

        const { walletname: importedWalletFileName } = recoverBody
        setRecoveredWallet({ walletFileName: importedWalletFileName, token: recoverBody.token })

        // Step #2: update the gaplimit config value
        await updateConfigValues({
          signal,
          updates: [
            {
              key: GAPLIMIT_CONFIGKEY,
              value: String(gaplimit),
            },
          ],
          wallet: { name: importedWalletFileName, token: recoverBody.token },
        })

        // Step #3: lock and unlock the wallet (for new addresses to be imported)
        const lockResponse = await Api.getWalletLock({ walletName: importedWalletFileName, token: recoverBody.token })
        if (!lockResponse.ok) await Api.Helper.throwError(lockResponse)

        const unlockResponse = await Api.postWalletUnlock({ walletName: importedWalletFileName }, { password })
        const unlockBody = await (unlockResponse.ok ? unlockResponse.json() : Api.Helper.throwError(unlockResponse))

        // Step #4: invoke rescanning the timechain
        const rescanResponse = await Api.getRescanBlockchain({
          signal,
          walletName: importedWalletFileName,
          token: unlockBody.token,
          blockheight,
        })
        if (!rescanResponse.ok) await Api.Helper.throwError(rescanResponse)

        startWallet(importedWalletFileName, unlockBody.token)
        navigate(routes.wallet)
      } catch (e: any) {
        if (signal.aborted) return
        const message = t('import_wallet.error_importing_failed', {
          reason: e.message || 'Unknown reason',
        })
        setAlert({ variant: 'danger', message })
      }
    },
    [setRecoveredWallet, startWallet, navigate, setAlert, updateConfigValues, t]
  )

  const step = useMemo(() => {
    if (!walletNameAndPassword) return 'input-wallet-details'
    if (!mnemonicPhrase) return 'input-mnemonic-phrase'
    return 'confirm-inputs-and-start-recovery'
  }, [walletNameAndPassword, mnemonicPhrase, recoveredWallet])

  return (
    <div className="import-wallet">
      <>
        {step === 'input-wallet-details' && <PageTitle title={t('import_wallet.wallet_details.title')} />}
        {step === 'input-mnemonic-phrase' && (
          <PageTitle
            title={t('import_wallet.mnemonic_phrase.title')}
            subtitle={t('import_wallet.mnemonic_phrase.subtitle')}
          />
        )}
        {step === 'confirm-inputs-and-start-recovery' && <PageTitle title={t('import_wallet.confirmation.title')} />}
      </>
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
          {step === 'confirm-inputs-and-start-recovery' && (
            <WalletCreationConfirmation
              wallet={{
                walletFileName: walletNameAndPassword?.name! + JM_WALLET_FILE_EXTENSION,
                password: walletNameAndPassword?.password!,
                seedphrase: mnemonicPhrase!,
              }}
              submitButtonText={(isSubmitting) => (
                <>
                  {t(
                    isSubmitting
                      ? 'import_wallet.confirmation.text_button_submitting'
                      : 'import_wallet.confirmation.text_button_submit'
                  )}
                </>
              )}
              onSubmit={() => {
                const abortCtrl = new AbortController()

                return recoverWallet(abortCtrl.signal, {
                  walletname: walletNameAndPassword?.name! as Api.WalletName,
                  password: walletNameAndPassword?.password!,
                  seedphrase: mnemonicPhrase!,
                  gaplimit,
                  blockheight: startBlockheight,
                })
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
