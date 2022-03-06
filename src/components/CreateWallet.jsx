import React, { useState } from 'react'
import * as rb from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import PageTitle from './PageTitle'
import ToggleSwitch from './ToggleSwitch'
import { serialize, walletDisplayName } from '../utils'
import { useCurrentWallet } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'

const WalletCreationForm = ({ createWallet, isCreating }) => {
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
          <rb.Form.Label>Wallet Name</rb.Form.Label>
          <rb.Form.Control name="wallet" placeholder="Your wallet..." disabled={isCreating} required />
          <rb.Form.Control.Feedback>Looks good!</rb.Form.Control.Feedback>
          <rb.Form.Control.Feedback type="invalid">Please set a wallet name.</rb.Form.Control.Feedback>
        </rb.Form.Group>
        <rb.Form.Group className="mb-4" controlId="password">
          <rb.Form.Label>Password</rb.Form.Label>
          <rb.Form.Control
            name="password"
            type="password"
            placeholder="Choose a secure password..."
            disabled={isCreating}
            autoComplete="new-password"
            required
          />
          <rb.Form.Control.Feedback>Looks good!</rb.Form.Control.Feedback>
          <rb.Form.Control.Feedback type="invalid">Please set a password.</rb.Form.Control.Feedback>
        </rb.Form.Group>
        <rb.Button variant="dark" type="submit" disabled={isCreating}>
          {isCreating ? (
            <div>
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
              Creating
            </div>
          ) : (
            'Create'
          )}
        </rb.Button>
      </rb.Form>
    </>
  )
}

const WalletCreationConfirmation = ({ createdWallet, walletConfirmed }) => {
  const [userConfirmed, setUserConfirmed] = useState(false)
  const [revealSensitiveInfo, setRevealSensitiveInfo] = useState(false)
  const [sensitiveInfoWasRevealed, setSensitiveInfoWasRevealed] = useState(false)
  const [step, setStep] = useState(0)
  const [seedBackup, setSeedBackup] = useState(false)
  const [words, setWords] = useState('')
  const [feedback, setFeedback] = useState(false)

  const onSubmit = () => {
    if (words === createdWallet.seedphrase) {
      setSeedBackup(true)
    } else {
      setFeedback(true)
    }
  }

  if (step === 0) {
    return (
      <div>
        <div className="mb-4">
          <div>Wallet Name</div>
          <div className="fs-4">{walletDisplayName(createdWallet.name)}</div>
        </div>
        <div className="mb-4">
          <Seedphrase seedphrase={createdWallet.seedphrase} isBlurred={!revealSensitiveInfo} />
        </div>
        <div className="mb-4">
          <div>Password</div>
          <div className={`fs-4${revealSensitiveInfo ? '' : ' blurred-text'}`}>
            {!revealSensitiveInfo ? 'randomrandom' : createdWallet.password}
          </div>
        </div>
        <div className="mb-2">
          <ToggleSwitch
            label="Reveal sensitive information"
            onToggle={(isToggled) => {
              setRevealSensitiveInfo(isToggled)
              setSensitiveInfoWasRevealed(true)
            }}
          />
        </div>
        <div className="mb-4">
          <ToggleSwitch
            label="I've written down the information above."
            onToggle={(isToggled) => setUserConfirmed(isToggled)}
          />
        </div>
        <rb.Button variant="dark" disabled={!sensitiveInfoWasRevealed || !userConfirmed} onClick={() => setStep(1)}>
          Next
        </rb.Button>
      </div>
    )
  } else {
    return (
      <div>
        <div className="fs-4">Confirm seed phrase backup</div>
        <p className="text-secondary">Enter each word in sequential order with a space in between.</p>

        <rb.Form onSubmit={onSubmit} validated={seedBackup} noValidate>
          <rb.Form.Control
            as="textarea"
            placeholder="Enter your seed phrase"
            style={{ height: '100px' }}
            value={words}
            onChange={(e) => {
              setFeedback(false)
              setWords(e.target.value)
            }}
            disabled={seedBackup}
            isInvalid={feedback === true}
            isValid={seedBackup === true}
          />
          <rb.Form.Control.Feedback>Seed phrase confirmed!</rb.Form.Control.Feedback>
          <rb.Form.Control.Feedback type="invalid">Words do not match.</rb.Form.Control.Feedback>
        </rb.Form>
        <div className="d-flex mt-3 gap-3">
          <rb.Button
            variant="dark"
            disabled={seedBackup}
            onClick={() => {
              setRevealSensitiveInfo(false)
              setSensitiveInfoWasRevealed(false)
              setUserConfirmed(false)
              setStep(0)
            }}
          >
            Back
          </rb.Button>
          {seedBackup === false ? (
            <rb.Button variant="dark" type="submit" onClick={() => onSubmit()}>
              Verify
            </rb.Button>
          ) : (
            <rb.Button variant="dark" onClick={() => userConfirmed && walletConfirmed()}>
              Fund wallet
            </rb.Button>
          )}
        </div>
      </div>
    )
  }
}

const Seedphrase = ({ seedphrase, isBlurred = true }) => {
  return (
    <div className="seedphrase slashed-zeroes d-flex flex-wrap">
      {seedphrase.split(' ').map((seedWord, index) => (
        <div key={index} className="d-flex py-2 ps-2 pe-3">
          <span className="seedword-index text-secondary text-end">{index + 1}</span>
          <span className="text-secondary">.&nbsp;</span>
          <span className={isBlurred ? 'blurred-text' : ''}>{isBlurred ? 'random' : seedWord}</span>
        </div>
      ))}
    </div>
  )
}

export default function CreateWallet({ startWallet }) {
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
      setAlert({ variant: 'danger', message: 'Wallet confirmation failed.' })
    }
  }

  const isCreated = createdWallet?.name && createdWallet?.seedphrase && createdWallet?.password
  const canCreate = !currentWallet && !isCreated

  return (
    <div className="create-wallet">
      {isCreated ? (
        <PageTitle
          title="Wallet created successfully!"
          subtitle="Please write down your seed phrase and password! Without this information you will not be able to access and recover your wallet!"
          success
        />
      ) : (
        <PageTitle title="Create Wallet" />
      )}
      {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
      {canCreate && <WalletCreationForm createWallet={createWallet} isCreating={isCreating} />}
      {isCreated && <WalletCreationConfirmation createdWallet={createdWallet} walletConfirmed={walletConfirmed} />}
      {!canCreate && !isCreated && (
        <rb.Alert variant="warning">
          Currently <strong>{walletDisplayName(currentWallet.name)}</strong> is active. You need to lock it first.{' '}
          <Link to="/" className="alert-link">
            Go back
          </Link>
          .
        </rb.Alert>
      )}
    </div>
  )
}
