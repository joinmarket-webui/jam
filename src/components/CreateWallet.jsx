import { useState, useEffect, useCallback, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import PageTitle from './PageTitle'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import PreventLeavingPageByMistake from './PreventLeavingPageByMistake'
import WalletCreationForm from './WalletCreationForm'
import { walletDisplayName } from '../utils'
import { useServiceInfo } from '../context/ServiceInfoContext'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import styles from './CreateWallet.module.css'

const SeedWordInput = ({ number, targetWord, isValid, setIsValid }) => {
  const { t } = useTranslation()
  const [enteredWord, setEnteredWord] = useState('')

  useEffect(() => {
    if (!isValid && enteredWord === targetWord) {
      // Only use effect when value changes from false -> true to prevent an endless re-rendering loop.
      setIsValid(true)
    }
  }, [enteredWord, targetWord, setIsValid, isValid])

  return (
    <rb.InputGroup>
      <rb.InputGroup.Text className={styles.seedwordIndexBackup}>{number}.</rb.InputGroup.Text>
      <rb.FormControl
        type="text"
        placeholder={`${t('create_wallet.placeholder_seed_word_input')} ${number}`}
        value={enteredWord}
        onChange={(e) => {
          setEnteredWord(e.target.value)
        }}
        className={styles.input}
        disabled={isValid}
        isInvalid={!isValid && enteredWord.length > 0}
        isValid={isValid}
        required
      />
    </rb.InputGroup>
  )
}

const BackupConfirmation = ({ createdWallet, walletConfirmed, parentStepSetter }) => {
  const seedphrase = createdWallet.seedphrase.split(' ')

  const { t } = useTranslation()
  const [seedWordConfirmations, setSeedWordConfirmations] = useState(new Array(seedphrase.length).fill(false))
  const [showSkipButton] = useState(isDebugFeatureEnabled('skipWalletBackupConfirmation'))

  const isSeedBackupConfirmed = useMemo(
    () => seedWordConfirmations.every((wordConfirmed) => wordConfirmed),
    [seedWordConfirmations]
  )

  return (
    <div>
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
                      <SeedWordInput
                        number={wordIndex + 1}
                        targetWord={seedWord}
                        isValid={seedWordConfirmations[wordIndex]}
                        setIsValid={(isValid) => {
                          setSeedWordConfirmations(
                            seedWordConfirmations.map((confirmation, index) =>
                              index === wordIndex ? isValid : confirmation
                            )
                          )
                        }}
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

      <rb.Button
        variant="dark"
        className={styles.button}
        onClick={() => walletConfirmed()}
        disabled={!isSeedBackupConfirmed}
      >
        {t('create_wallet.confirmation_button_fund_wallet')}
      </rb.Button>

      <div className="d-flex mt-4 mb-4 gap-4">
        <rb.Button
          variant="outline-dark"
          disabled={isSeedBackupConfirmed}
          className={styles.button}
          onClick={() => {
            parentStepSetter()
          }}
        >
          {t('create_wallet.back_button')}
        </rb.Button>

        {showSkipButton && (
          <rb.Button
            variant="outline-dark"
            className={styles.button}
            onClick={() => walletConfirmed()}
            disabled={isSeedBackupConfirmed}
          >
            {t('create_wallet.skip_button')}
          </rb.Button>
        )}
      </div>
    </div>
  )
}

const WalletCreationConfirmation = ({ createdWallet, walletConfirmed }) => {
  const { t } = useTranslation()
  const [userConfirmed, setUserConfirmed] = useState(false)
  const [revealSensitiveInfo, setRevealSensitiveInfo] = useState(false)
  const [sensitiveInfoWasRevealed, setSensitiveInfoWasRevealed] = useState(false)
  const [step, setStep] = useState(0)

  function childStepSetter() {
    setRevealSensitiveInfo(false)
    setSensitiveInfoWasRevealed(false)
    setUserConfirmed(false)
    setStep(0)
  }

  return (
    <>
      <PreventLeavingPageByMistake />
      {step === 0 ? (
        <div>
          <div className="mb-4">
            <div>{t('create_wallet.confirmation_label_wallet_name')}</div>
            <div className="fs-4">{walletDisplayName(createdWallet.name)}</div>
          </div>
          <div className="mb-4">
            <Seedphrase seedphrase={createdWallet.seedphrase} isBlurred={!revealSensitiveInfo} />
          </div>
          <div className="mb-4">
            <div>{t('create_wallet.confirmation_label_password')}</div>
            <div className={`fs-4${revealSensitiveInfo ? '' : ' blurred-text'}`}>
              {!revealSensitiveInfo ? 'randomrandom' : createdWallet.password}
            </div>
          </div>
          <div className="mb-2">
            <ToggleSwitch
              label={t('create_wallet.confirmation_toggle_reveal_info')}
              toggledOn={revealSensitiveInfo}
              onToggle={(isToggled) => {
                setRevealSensitiveInfo(isToggled)
                setSensitiveInfoWasRevealed(true)
              }}
            />
          </div>
          <div className="mb-4">
            <ToggleSwitch
              label={t('create_wallet.confirmation_toggle_info_written_down')}
              toggledOn={userConfirmed}
              onToggle={(isToggled) => setUserConfirmed(isToggled)}
            />
          </div>
          <rb.Button
            variant="dark"
            disabled={!sensitiveInfoWasRevealed || !userConfirmed}
            className={styles.button}
            onClick={() => setStep(1)}
          >
            {t('create_wallet.next_button')}
          </rb.Button>
        </div>
      ) : (
        <BackupConfirmation
          parentStepSetter={childStepSetter}
          createdWallet={createdWallet}
          walletConfirmed={walletConfirmed}
        />
      )}
    </>
  )
}

export default function CreateWallet({ startWallet }) {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()
  const navigate = useNavigate()

  const [alert, setAlert] = useState(null)
  const [createdWallet, setCreatedWallet] = useState(null)

  const createWallet = useCallback(
    async (walletName, password) => {
      setAlert(null)

      try {
        const res = await Api.postWalletCreate({ walletname: walletName, password })
        const body = await (res.ok ? res.json() : Api.Helper.throwError(res))

        const { seedphrase, token, walletname: createdWalletName } = body
        setCreatedWallet({ name: createdWalletName, seedphrase, password, token })
      } catch (e) {
        setAlert({ variant: 'danger', message: e.message })
      }
    },
    [setAlert, setCreatedWallet]
  )

  const walletConfirmed = () => {
    if (createdWallet.name && createdWallet.token) {
      startWallet(createdWallet.name, createdWallet.token)
      navigate(routes.wallet)
    } else {
      setAlert({ variant: 'danger', message: t('alert_confirmation_failed') })
    }
  }

  const isCreated = createdWallet?.name && createdWallet?.seedphrase && createdWallet?.password
  const canCreate = !isCreated && !serviceInfo?.walletName

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
      {isCreated && <WalletCreationConfirmation createdWallet={createdWallet} walletConfirmed={walletConfirmed} />}
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
