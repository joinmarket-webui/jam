import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import PageTitle from './PageTitle'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import { serialize, walletDisplayName } from '../utils'
import { useServiceInfo } from '../context/ServiceInfoContext'
import * as Api from '../libs/JmWalletApi'
import './CreateWallet.css'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Alert from 'react-bootstrap/Alert'
import Spinner from 'react-bootstrap/Spinner'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'

const PreventLeavingPageByMistake = () => {
  // prompt users before refreshing or closing the page when this component is present.
  // Firefox will show: "This page is asking you to confirm that you want to leave [...]"
  // Chrome: "Leave site? Changes you made may not be saved."
  useEffect(() => {
    const abortCtrl = new AbortController()

    window.addEventListener(
      'beforeunload',
      (event) => {
        // cancel the event as stated by the standard.
        event.preventDefault()

        // Chrome requires returnValue to be set.
        event.returnValue = ''

        // return something to trigger a dialog
        return ''
      },
      { signal: abortCtrl.signal }
    )

    return () => abortCtrl.abort()
  }, [])

  return <></>
}

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
      {isCreating && <PreventLeavingPageByMistake />}
      <Form onSubmit={onSubmit} validated={validated} noValidate>
        <Form.Group className="mb-4" controlId="walletName">
          <Form.Label>{t('create_wallet.label_wallet_name')}</Form.Label>
          <Form.Control
            name="wallet"
            placeholder={t('create_wallet.placeholder_wallet_name')}
            disabled={isCreating}
            required
          />
          <Form.Control.Feedback>{t('create_wallet.feedback_valid')}</Form.Control.Feedback>
          <Form.Control.Feedback type="invalid">
            {t('create_wallet.feedback_invalid_wallet_name')}
          </Form.Control.Feedback>
        </Form.Group>
        <Form.Group className="mb-4" controlId="password">
          <Form.Label>{t('create_wallet.label_password')}</Form.Label>
          <Form.Control
            name="password"
            type="password"
            placeholder={t('create_wallet.placeholder_password')}
            disabled={isCreating}
            autoComplete="new-password"
            required
          />
          <Form.Control.Feedback>{t('create_wallet.feedback_valid')}</Form.Control.Feedback>
          <Form.Control.Feedback type="invalid">{t('create_wallet.feedback_invalid_password')}</Form.Control.Feedback>
        </Form.Group>
        <Button variant="dark" type="submit" disabled={isCreating}>
          {isCreating ? (
            <div>
              <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              {t('create_wallet.button_creating')}
            </div>
          ) : (
            t('create_wallet.button_create')
          )}
        </Button>
      </Form>
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
    <InputGroup>
      <InputGroup.Text className="seedword-index-backup">{number}.</InputGroup.Text>
      <FormControl
        type="text"
        placeholder={`${t('create_wallet.placeholder_seed_word_input')} ${number}`}
        value={enteredWord}
        onChange={(e) => {
          setEnteredWord(e.target.value)
        }}
        disabled={isValid}
        isInvalid={!isValid && enteredWord.length > 0}
        isValid={isValid}
        required
      />
    </InputGroup>
  )
}

const BackupConfirmation = ({ createdWallet, walletConfirmed, parentStepSetter, devMode }) => {
  const seedphrase = createdWallet.seedphrase.split(' ')

  const { t } = useTranslation()
  const [seedBackup, setSeedBackup] = useState(false)
  const [seedWordConfirmations, setSeedWordConfirmations] = useState(new Array(seedphrase.length).fill(false))
  const [showSkipButton] = useState(devMode)

  useEffect(() => {
    setSeedBackup(seedWordConfirmations.every((wordConfirmed) => wordConfirmed))
  }, [seedWordConfirmations])

  return (
    <div>
      <div className="fs-4">{t('create_wallet.confirm_backup_title')}</div>
      <p className="text-secondary">{t('create_wallet.confirm_backup_subtitle')}</p>

      <Form noValidate>
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
      </Form>
      {seedBackup && <div className="text-center text-success">{t('create_wallet.feedback_seed_confirmed')}</div>}

      <Button variant="dark" onClick={() => walletConfirmed()} disabled={!seedBackup}>
        {t('create_wallet.confirmation_button_fund_wallet')}
      </Button>

      <div className="d-flex mt-4 mb-4 gap-4">
        <Button
          variant="outline-dark"
          disabled={seedBackup}
          onClick={() => {
            parentStepSetter()
          }}
        >
          {t('create_wallet.back_button')}
        </Button>

        {showSkipButton && (
          <Button variant="outline-dark" onClick={() => walletConfirmed()} disabled={seedBackup}>
            {t('create_wallet.skip_button')}
          </Button>
        )}
      </div>
    </div>
  )
}

const WalletCreationConfirmation = ({ createdWallet, walletConfirmed, devMode }) => {
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
          <Button variant="dark" disabled={!sensitiveInfoWasRevealed || !userConfirmed} onClick={() => setStep(1)}>
            {t('create_wallet.next_button')}
          </Button>
        </div>
      ) : (
        <BackupConfirmation
          parentStepSetter={childStepSetter}
          createdWallet={createdWallet}
          walletConfirmed={walletConfirmed}
          devMode={devMode}
        />
      )}
    </>
  )
}

export default function CreateWallet({ startWallet, devMode = false }) {
  const { t } = useTranslation()
  const serviceInfo = useServiceInfo()
  const navigate = useNavigate()

  const [alert, setAlert] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createdWallet, setCreatedWallet] = useState(null)

  const createWallet = async (walletName, password) => {
    setAlert(null)
    setIsCreating(true)

    try {
      const res = await Api.postWalletCreate({ walletname: walletName, password })

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
      {alert && <Alert variant={alert.variant}>{alert.message}</Alert>}
      {canCreate && <WalletCreationForm createWallet={createWallet} isCreating={isCreating} />}
      {isCreated && (
        <WalletCreationConfirmation createdWallet={createdWallet} walletConfirmed={walletConfirmed} devMode={devMode} />
      )}
      {!canCreate && !isCreated && (
        <Alert variant="warning">
          <Trans i18nKey="create_wallet.alert_other_wallet_unlocked">
            Currently <strong>{{ walletName: walletDisplayName(serviceInfo?.walletName) }}</strong> is active. You need
            to lock it first.
            <Link to="/" className="alert-link">
              Go back
            </Link>
            .
          </Trans>
        </Alert>
      )}
    </div>
  )
}
