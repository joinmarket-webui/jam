import { useState, useCallback, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import PageTitle from './PageTitle'
import WalletCreationConfirmation from './WalletCreationConfirmation'
import PreventLeavingPageByMistake from './PreventLeavingPageByMistake'
import WalletCreationForm from './WalletCreationForm'
import MnemonicWordInput from './MnemonicWordInput'
import { walletDisplayName } from '../utils'
import { useServiceInfo } from '../context/ServiceInfoContext'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import styles from './CreateWallet.module.css'

const BackupConfirmation = ({ wallet, onSuccess, onCancel }) => {
  const seedphrase = useMemo(() => wallet.seedphrase.split(' '), [wallet])

  const { t } = useTranslation()
  const [givenWords, setGivenWords] = useState(new Array(seedphrase.length).fill(''))
  const [showSkipButton] = useState(isDebugFeatureEnabled('skipWalletBackupConfirmation'))

  const isSeedBackupConfirmed = useMemo(
    () => givenWords.every((word, index) => word === seedphrase[index]),
    [givenWords, seedphrase]
  )

  return (
    <div>
      <PreventLeavingPageByMistake />
      <div className="fs-4">{t('create_wallet.confirm_backup_title')}</div>
      <p className="text-secondary">{t('create_wallet.confirm_backup_subtitle')}</p>

      <rb.Form noValidate>
        <div className="container slashed-zeroes p-0">
          {[...new Array(seedphrase.length)].map((_, outerIndex) => {
            if (outerIndex % 2 !== 0) return null

            const seedWords = seedphrase.slice(outerIndex, outerIndex + 2)

            return (
              <div className="row mb-4" key={outerIndex}>
                {seedWords.map((seedWord, innerIndex) => {
                  const wordIndex = outerIndex + innerIndex
                  return (
                    <div className="col" key={wordIndex}>
                      <MnemonicWordInput
                        index={wordIndex}
                        value={givenWords[wordIndex]}
                        setValue={(value) =>
                          setGivenWords((words) => words.map((old, index) => (index === wordIndex ? value : old)))
                        }
                        isValid={givenWords[wordIndex] === seedWord}
                        disabled={givenWords[wordIndex] === seedWord}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </rb.Form>
      {isSeedBackupConfirmed && (
        <div className="mb-4 text-center text-success">{t('create_wallet.feedback_seed_confirmed')}</div>
      )}

      <rb.Button variant="dark" className={styles.button} onClick={() => onSuccess()} disabled={!isSeedBackupConfirmed}>
        {t('create_wallet.confirmation_button_fund_wallet')}
      </rb.Button>

      <div className="d-flex mt-4 mb-4 gap-4">
        <rb.Button
          variant="outline-dark"
          disabled={isSeedBackupConfirmed}
          className={styles.button}
          onClick={() => onCancel()}
        >
          {t('create_wallet.back_button')}
        </rb.Button>

        {showSkipButton && (
          <rb.Button
            variant="outline-dark"
            className={styles.button}
            onClick={() => onSuccess()}
            disabled={isSeedBackupConfirmed}
          >
            {t('create_wallet.skip_button')}
          </rb.Button>
        )}
      </div>
    </div>
  )
}

export default function CreateWallet({ startWallet }) {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()
  const navigate = useNavigate()

  const [alert, setAlert] = useState(null)
  const [createdWallet, setCreatedWallet] = useState(null)

  const createWallet = useCallback(
    async ({ walletName, password }) => {
      setAlert(null)

      try {
        const res = await Api.postWalletCreate({}, { walletname: walletName, password })
        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))

        const { seedphrase, token, walletname: createdWalletFileName } = body
        setCreatedWallet({ walletFileName: createdWalletFileName, seedphrase, password, token })
      } catch (e) {
        const message = t('create_wallet.error_creating_failed', {
          reason: e.message || 'Unknown reason',
        })
        setAlert({ variant: 'danger', message })
      }
    },
    [setAlert, setCreatedWallet, t]
  )

  const walletConfirmed = useCallback(() => {
    if (createdWallet?.walletFileName && createdWallet?.token) {
      setAlert(null)
      startWallet(createdWallet.walletFileName, createdWallet.token)
      navigate(routes.wallet)
    } else {
      setAlert({ variant: 'danger', message: t('create_wallet.alert_confirmation_failed') })
    }
  }, [createdWallet, startWallet, navigate, setAlert, t])

  const isCreated = useMemo(
    () => createdWallet?.walletFileName && createdWallet?.seedphrase && createdWallet?.password,
    [createdWallet]
  )
  const canCreate = useMemo(() => !isCreated && !serviceInfo?.walletName, [isCreated, serviceInfo])
  const [showBackupConfirmation, setShowBackupConfirmation] = useState(false)

  return (
    <div className="create-wallet">
      {isCreated ? (
        <PageTitle
          title={t('create_wallet.title_wallet_created')}
          subtitle={t('create_wallet.subtitle_wallet_created')}
          success
        />
      ) : (
        <PageTitle title={t('create_wallet.title')} />
      )}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {canCreate && (
        <WalletCreationForm
          onSubmit={createWallet}
          submitButtonText={(isSubmitting) => (
            <>{t(isSubmitting ? 'create_wallet.button_creating' : 'create_wallet.button_create')}</>
          )}
        />
      )}
      {isCreated && (
        <>
          {!showBackupConfirmation ? (
            <>
              <WalletCreationConfirmation
                wallet={createdWallet}
                submitButtonText={(_) => <>{t('create_wallet.next_button')}</>}
                onSubmit={() => setShowBackupConfirmation(true)}
              />
            </>
          ) : (
            <>
              <BackupConfirmation
                wallet={createdWallet}
                onSuccess={walletConfirmed}
                onCancel={() => setShowBackupConfirmation(false)}
              />
            </>
          )}
        </>
      )}
      {!canCreate && !isCreated && (
        <rb.Alert variant="warning">
          <Trans i18nKey="create_wallet.alert_other_wallet_unlocked">
            Currently <strong>{{ walletName: walletDisplayName(serviceInfo?.walletName) }}</strong> is active. You need
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
