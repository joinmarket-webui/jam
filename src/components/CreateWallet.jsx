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
  const [wordOne, setWordOne] = useState('')
  const [wordTwo, setWordTwo] = useState('')
  const [wordThree, setWordThree] = useState('')
  const [wordFour, setWordFour] = useState('')
  const [wordFive, setWordFive] = useState('')
  const [wordSix, setWordSix] = useState('')
  const [wordSeven, setWordSeven] = useState('')
  const [wordEight, setWordEight] = useState('')
  const [wordNine, setWordNine] = useState('')
  const [wordTen, setWordTen] = useState('')
  const [wordEleven, setWordEleven] = useState('')
  const [wordTwelve, setWordTwelve] = useState('')
  const [feedback, setFeedback] = useState(false)
  let seedphrase = createdWallet.seedphrase.split(' ')

  const onSubmit = () => {
    if (
      wordOne === seedphrase[0] &&
      wordTwo === seedphrase[1] &&
      wordThree === seedphrase[2] &&
      wordFour === seedphrase[3] &&
      wordFive === seedphrase[4] &&
      wordSix === seedphrase[5] &&
      wordSeven === seedphrase[6] &&
      wordEight === seedphrase[7] &&
      wordNine === seedphrase[8] &&
      wordTen === seedphrase[9] &&
      wordEleven === seedphrase[10] &&
      wordTwelve === seedphrase[11]
    ) {
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
        <p className="text-secondary">Enter each word in sequential order.</p>

        <rb.Form noValidate>
          <div className="container">
            <div className="row mb-4">
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="One"
                  value={wordOne}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordOne(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordOne === seedphrase[0]}
                  isValid={wordOne === seedphrase[0]}
                  required
                />
                {wordOne === seedphrase[0] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Two"
                  value={wordTwo}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordTwo(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordTwo === seedphrase[1]}
                  isValid={wordTwo === seedphrase[1]}
                  required
                />
                {wordTwo === seedphrase[1] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
            </div>
            <div className="row mb-4">
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Three"
                  value={wordThree}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordThree(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordThree === seedphrase[2]}
                  isValid={wordThree === seedphrase[2]}
                  required
                />
                {wordThree === seedphrase[2] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Four"
                  value={wordFour}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordFour(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordFour === seedphrase[3]}
                  isValid={wordFour === seedphrase[3]}
                  required
                />
                {wordFour === seedphrase[3] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
            </div>
            <div className="row mb-4">
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Five"
                  value={wordFive}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordFive(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordFive === seedphrase[4]}
                  isValid={wordFive === seedphrase[4]}
                  required
                />
                {wordFive === seedphrase[4] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Six"
                  value={wordSix}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordSix(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordSix === seedphrase[5]}
                  isValid={wordSix === seedphrase[5]}
                  required
                />
                {wordSix === seedphrase[5] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
            </div>
            <div className="row mb-4">
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Seven"
                  value={wordSeven}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordSeven(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordSeven === seedphrase[6]}
                  isValid={wordSeven === seedphrase[6]}
                  required
                />
                {wordSeven === seedphrase[6] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Eight"
                  value={wordEight}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordEight(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordEight === seedphrase[7]}
                  isValid={wordEight === seedphrase[7]}
                  required
                />
                {wordEight === seedphrase[7] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
            </div>
            <div className="row mb-4">
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Nine"
                  value={wordNine}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordNine(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordNine === seedphrase[8]}
                  isValid={wordNine === seedphrase[8]}
                  required
                />
                {wordNine === seedphrase[8] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Ten"
                  value={wordTen}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordTen(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordTen === seedphrase[9]}
                  isValid={wordTen === seedphrase[9]}
                  required
                />
                {wordTen === seedphrase[9] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
            </div>
            <div className="row mb-3">
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Eleven"
                  value={wordEleven}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordEleven(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordEleven === seedphrase[10]}
                  isValid={wordEleven === seedphrase[10]}
                  required
                />
                {wordEleven === seedphrase[10] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
              <div className="col">
                <rb.InputGroup />
                <rb.FormControl
                  type="text"
                  placeholder="Twelve"
                  value={wordTwelve}
                  onChange={(e) => {
                    setFeedback(false)
                    setWordTwelve(e.target.value)
                  }}
                  disabled={seedBackup}
                  isInvalid={!wordTwelve === seedphrase[11]}
                  isValid={wordTwelve === seedphrase[11]}
                  required
                />
                {wordTwelve === seedphrase[11] && !seedBackup ? (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                ) : (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </div>
            </div>
          </div>
        </rb.Form>
        {seedBackup ? <div className="text-center text-success">Seed phrase confirmed.</div> : <></>}
        {feedback ? <div className="text-center text-danger">All words must match.</div> : <></>}
        <div className="d-flex mt-4 mb-4 gap-3">
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
            <rb.Button variant="dark" onClick={() => onSubmit()}>
              Verify
            </rb.Button>
          ) : (
            <rb.Button variant="dark" onClick={() => userConfirmed && walletConfirmed()}>
              Fund wallet
            </rb.Button>
          )}
        </div>
        {seedBackup === false ? (
          <rb.Button variant="outline-dark" onClick={() => userConfirmed && walletConfirmed()}>
            Skip
          </rb.Button>
        ) : (
          <></>
        )}
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
