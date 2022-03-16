import React, { useState, useEffect } from 'react'
import * as rb from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import PageTitle from './PageTitle'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import { serialize, walletDisplayName } from '../utils'
import { useCurrentWallet } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'

const WalletCreationForm = ({ createWallet, isCreating }) => {
  const { t } = useTranslation()
  const [validated, setValidated] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()

    const form = e.currentTarget
    const isValid = form.checkValidity()
    setValidated(true)

    if (isValid) {
      const { wallet, password } = serialize(form)
      createWallet(wallet, password)
    }
  }

  return (
    <>
      <rb.Form onSubmit={onSubmit} validated={validated} noValidate>
        <rb.Form.Group className="mb-4" controlId="walletName">
          <rb.Form.Label>{t('create_wallet.label_wallet_name')}</rb.Form.Label>
          <rb.Form.Control
            name="wallet"
            placeholder={t('create_wallet.placeholder_wallet_name')}
            disabled={isCreating}
            required
          />
          <rb.Form.Control.Feedback>{t('create_wallet.feedback_valid')}</rb.Form.Control.Feedback>
          <rb.Form.Control.Feedback type="invalid">
            {t('create_wallet.feedback_invalid_wallet_name')}
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
        <rb.Form.Group className="mb-4" controlId="password">
          <rb.Form.Label>{t('create_wallet.label_password')}</rb.Form.Label>
          <rb.Form.Control
            name="password"
            type="password"
            placeholder={t('create_wallet.placeholder_password')}
            disabled={isCreating}
            autoComplete="new-password"
            required
          />
          <rb.Form.Control.Feedback>{t('create_wallet.feedback_valid')}</rb.Form.Control.Feedback>
          <rb.Form.Control.Feedback type="invalid">
            {t('create_wallet.feedback_invalid_password')}
          </rb.Form.Control.Feedback>
        </rb.Form.Group>
        <rb.Button variant="dark" type="submit" disabled={isCreating}>
          {isCreating ? (
            <div>
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              {t('create_wallet.button_creating')}
            </div>
          ) : (
            t('create_wallet.button_create')
          )}
        </rb.Button>
      </rb.Form>
    </>
  )
}

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
      <rb.InputGroup.Text className="seedword-index-backup">{number}.</rb.InputGroup.Text>
      <rb.FormControl
        type="text"
        placeholder={`${t('create_wallet.word')} ${number}`}
        value={enteredWord}
        onChange={(e) => {
          setEnteredWord(e.target.value)
        }}
        disabled={isValid}
        isInvalid={!isValid && enteredWord.length > 0}
        isValid={isValid}
        required
      />
    </rb.InputGroup>
  )
}

const BackupConfirmation = ({ createdWallet, walletConfirmed, parentStepSetter }) => {
  const { t } = useTranslation()
  const [seedBackup, setSeedBackup] = useState(false)
  let seedphrase = createdWallet.seedphrase.split(' ')
  const [seedWordConfirmations, setSeedWordConfirmations] = useState(new Array(seedphrase.length).fill(false))

  useEffect(() => {
    setSeedBackup(seedWordConfirmations.every((wordConfirmed) => wordConfirmed))
  }, [seedWordConfirmations])

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
      {seedBackup && <div className="text-center text-success">{t('create_wallet.seed_confirmed')}</div>}

      <div className="d-flex mt-4 mb-4 gap-3">
        <rb.Button
          variant="dark"
          disabled={seedBackup}
          onClick={() => {
            parentStepSetter()
          }}
        >
          {t('create_wallet.back_button')}
        </rb.Button>

        <rb.Button variant="dark" onClick={() => walletConfirmed()} disabled={!seedBackup}>
          {t('create_wallet.confirmation_button_fund_wallet')}
        </rb.Button>
      </div>

      <rb.Button variant="outline-dark" onClick={() => walletConfirmed()} disabled={seedBackup}>
        {t('create_wallet.skip_button')}
      </rb.Button>
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

  if (step === 0) {
    return (
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
            onToggle={(isToggled) => {
              setRevealSensitiveInfo(isToggled)
              setSensitiveInfoWasRevealed(true)
            }}
          />
        </div>
        <div className="mb-4">
          <ToggleSwitch
            label={t('create_wallet.confirmation_toggle_info_written_down')}
            onToggle={(isToggled) => setUserConfirmed(isToggled)}
          />
        </div>
        <rb.Button variant="dark" disabled={!sensitiveInfoWasRevealed || !userConfirmed} onClick={() => setStep(1)}>
          {t('create_wallet.next_button')}
        </rb.Button>
      </div>
    )
  } else {
    return (
      <BackupConfirmation
        parentStepSetter={childStepSetter}
        createdWallet={createdWallet}
        walletConfirmed={walletConfirmed}
      />
    )
  }
}

export default function CreateWallet({ startWallet }) {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const navigate = useNavigate()

  const [alert, setAlert] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createdWallet, setCreatedWallet] = useState(null)

  const createWallet = async (walletName, password) => {
    setAlert(null)
    setIsCreating(true)

    try {
      const res = await Api.postWalletCreate({ walletName, password })

      if (res.ok) {
        const { seedphrase, token, walletname: createdWalletName } = await res.json()
        setCreatedWallet({ name: createdWalletName, seedphrase, password, token })
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message })
    } finally {
      setIsCreating(false)
    }
  }

  const walletConfirmed = () => {
    if (createdWallet.name && createdWallet.token) {
      startWallet(createdWallet.name, createdWallet.token)
      navigate('/wallet')
    } else {
      setAlert({ variant: 'danger', message: t('alert_confirmation_failed') })
    }
  }

  const isCreated = createdWallet?.name && createdWallet?.seedphrase && createdWallet?.password
  const canCreate = !currentWallet && !isCreated

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
      {canCreate && <WalletCreationForm createWallet={createWallet} isCreating={isCreating} />}
      {isCreated && <WalletCreationConfirmation createdWallet={createdWallet} walletConfirmed={walletConfirmed} />}
      {!canCreate && !isCreated && (
        <rb.Alert variant="warning">
          <Trans i18nKey="create_wallet.alert_other_wallet_unlocked">
            Currently <strong>{{ walletName: walletDisplayName(currentWallet.name) }}</strong> is active. You need to
            lock it first.
            <Link to="/" className="alert-link">
              Go back
            </Link>
            .
          </Trans>
        </rb.Alert>
      )}
    </div>
  )
}
