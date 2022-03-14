import React, { useState } from 'react'
import * as rb from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import PageTitle from './PageTitle'
import Seedphrase from './Seedphrase'
import ToggleSwitch from './ToggleSwitch'
import { serialize, walletDisplayName } from '../utils'
import { useSessionInfo } from '../context/SessionInfoContext'
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
      <rb.Button
        variant="dark"
        type="submit"
        disabled={!sensitiveInfoWasRevealed || !userConfirmed}
        onClick={() => userConfirmed && walletConfirmed()}
      >
        Fund wallet
      </rb.Button>
    </div>
  )
}

export default function CreateWallet({ startWallet }) {
  const sessionInfo = useSessionInfo()
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
  const canCreate = !isCreated && sessionInfo && sessionInfo.wallet_name === 'None'

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
          Currently <strong>{walletDisplayName(sessionInfo && sessionInfo.wallet_name)}</strong> is active. You need to
          lock it first.{' '}
          <Link to="/" className="alert-link">
            Go back
          </Link>
          .
        </rb.Alert>
      )}
    </div>
  )
}
