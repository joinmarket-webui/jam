import { useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'
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

const MnemonicPhraseInputForm = ({ onSubmit }: { onSubmit: () => void }) => {
  const { t } = useTranslation()
  const [mnemonicPhraseWords, setMnemonicPhraseWords] = useState(new Array(12).fill(''))
  const [showFillerButton] = useState(isDebugFeatureEnabled('importFillerMnemonicPhrase'))

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
          //walletConfirmed()
        }}
        disabled={true}
      >
        {t('import_wallet.mnemonic_phrase.text_button_submit')}
      </rb.Button>

      <div className="d-flex mt-4 mb-4 gap-4">
        <rb.Button
          variant="outline-dark"
          disabled={false}
          className={styles.button}
          onClick={() => {
            // parentStepSetter()
          }}
        >
          {t('create_wallet.back_button')}
        </rb.Button>

        {showFillerButton && (
          <rb.Button
            variant="outline-dark"
            className={styles.button}
            onClick={() => {
              //walletConfirmed()
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

export default function ImportWallet() {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()

  const [alert] = useState<SimpleAlert>()
  const [walletNameAndPassword, setWalletNameAndPassword] = useState<{ name: string; password: string }>()
  const [createdWallet] = useState<any>()

  const isCreated = useMemo(
    () => createdWallet?.name && createdWallet?.seedphrase && createdWallet?.password,
    [createdWallet]
  )
  const canCreate = useMemo(() => !isCreated && !serviceInfo?.walletName, [isCreated, serviceInfo])

  const step = useMemo(() => {
    if (!walletNameAndPassword) return 'input-wallet-details'
    return 'input-mnemonic-phrase'
  }, [walletNameAndPassword])

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
      {canCreate && (
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
              onSubmit={() => {
                /* TODO */
              }}
            />
          )}
        </>
      )}
      {!canCreate && !isCreated && serviceInfo?.walletName && (
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
