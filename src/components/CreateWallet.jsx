import React, { useState, useEffect } from 'react'
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

const BackupConfirmation = ({ createdWallet, walletConfirmed, parentStepSetter, userConfirmed }) => {
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

  useEffect(() => {
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
    }
  }, [
    wordOne,
    wordTwo,
    wordThree,
    wordFour,
    wordFive,
    wordSix,
    wordSeven,
    wordEight,
    wordNine,
    wordTen,
    wordEleven,
    wordTwelve,
  ])

  let seedphrase = createdWallet.seedphrase.split(' ')

  return (
    <div>
      <div className="fs-4">Confirm seed phrase backup</div>
      <p className="text-secondary">Enter each word in sequential order.</p>

      <rb.Form noValidate>
        <div className="container">
          <div className="row mb-4">
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>1.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 1"
                  value={wordOne}
                  onChange={(e) => {
                    setWordOne(e.target.value)
                  }}
                  disabled={wordOne === seedphrase[0]}
                  isInvalid={wordOne !== seedphrase[0] && wordOne.length > 0}
                  isValid={wordOne === seedphrase[0]}
                  required
                />
                {wordOne === seedphrase[0] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordOne !== seedphrase[0] && wordOne.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>2.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 2"
                  value={wordTwo}
                  onChange={(e) => {
                    setWordTwo(e.target.value)
                  }}
                  disabled={wordTwo === seedphrase[1]}
                  isInvalid={wordTwo !== seedphrase[1] && wordTwo.length > 0}
                  isValid={wordTwo === seedphrase[1]}
                  required
                />
                {wordTwo === seedphrase[1] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordTwo !== seedphrase[1] && wordTwo.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
          </div>
          <div className="row mb-4">
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>3.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 3"
                  value={wordThree}
                  onChange={(e) => {
                    setWordThree(e.target.value)
                  }}
                  disabled={wordThree === seedphrase[2]}
                  isInvalid={wordThree !== seedphrase[2] && wordThree.length > 0}
                  isValid={wordThree === seedphrase[2]}
                  required
                />
                {wordThree === seedphrase[2] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordThree !== seedphrase[2] && wordThree.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>4.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 4"
                  value={wordFour}
                  onChange={(e) => {
                    setWordFour(e.target.value)
                  }}
                  disabled={wordFour === seedphrase[3]}
                  isInvalid={wordFour !== seedphrase[3] && wordFour.length > 0}
                  isValid={wordFour === seedphrase[3]}
                  required
                />
                {wordFour === seedphrase[3] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordFour !== seedphrase[3] && wordFour.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
          </div>
          <div className="row mb-4">
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>5.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 5"
                  value={wordFive}
                  onChange={(e) => {
                    setWordFive(e.target.value)
                  }}
                  disabled={wordFive === seedphrase[4]}
                  isInvalid={wordFive !== seedphrase[4] && wordFive.length > 0}
                  isValid={wordFive === seedphrase[4]}
                  required
                />
                {wordFive === seedphrase[4] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordFive !== seedphrase[4] && wordFive.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>6.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 6"
                  value={wordSix}
                  onChange={(e) => {
                    setWordSix(e.target.value)
                  }}
                  disabled={wordSix === seedphrase[5]}
                  isInvalid={wordSix !== seedphrase[5] && wordSix.length > 0}
                  isValid={wordSix === seedphrase[5]}
                  required
                />
                {wordSix === seedphrase[5] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordSix !== seedphrase[5] && wordSix.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
          </div>
          <div className="row mb-4">
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>7.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 7"
                  value={wordSeven}
                  onChange={(e) => {
                    setWordSeven(e.target.value)
                  }}
                  disabled={wordSeven === seedphrase[6]}
                  isInvalid={wordSeven !== seedphrase[6] && wordSeven.length > 0}
                  isValid={wordSeven === seedphrase[6]}
                  required
                />
                {wordSeven === seedphrase[6] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordSeven !== seedphrase[6] && wordSeven.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>8.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 8"
                  value={wordEight}
                  onChange={(e) => {
                    setWordEight(e.target.value)
                  }}
                  disabled={wordEight === seedphrase[7]}
                  isInvalid={wordEight !== seedphrase[7] && wordEight.length > 0}
                  isValid={wordEight === seedphrase[7]}
                  required
                />
                {wordEight === seedphrase[7] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordEight !== seedphrase[7] && wordEight.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
          </div>
          <div className="row mb-4">
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>9.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 9"
                  value={wordNine}
                  onChange={(e) => {
                    setWordNine(e.target.value)
                  }}
                  disabled={wordNine === seedphrase[8]}
                  isInvalid={wordNine !== seedphrase[8] && wordNine.length > 0}
                  isValid={wordNine === seedphrase[8]}
                  required
                />
                {wordNine === seedphrase[8] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordNine !== seedphrase[8] && wordNine.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>10.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 10"
                  value={wordTen}
                  onChange={(e) => {
                    setWordTen(e.target.value)
                  }}
                  disabled={wordTen === seedphrase[9]}
                  isInvalid={wordTen !== seedphrase[9] && wordTen.length > 0}
                  isValid={wordTen === seedphrase[9]}
                  required
                />
                {wordTen === seedphrase[9] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordTen !== seedphrase[9] && wordTen.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
          </div>
          <div className="row mb-3">
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>11.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 11"
                  value={wordEleven}
                  onChange={(e) => {
                    setWordEleven(e.target.value)
                  }}
                  disabled={wordEleven === seedphrase[10]}
                  isInvalid={wordEleven !== seedphrase[10] && wordEleven.length > 0}
                  isValid={wordEleven === seedphrase[10]}
                  required
                />
                {wordEleven === seedphrase[10] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordEleven !== seedphrase[10] && wordEleven.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
            <div className="col">
              <rb.InputGroup>
                <rb.InputGroup.Text>12.</rb.InputGroup.Text>
                <rb.FormControl
                  type="text"
                  placeholder="Word 12"
                  value={wordTwelve}
                  onChange={(e) => {
                    setWordTwelve(e.target.value)
                  }}
                  disabled={wordTwelve === seedphrase[11]}
                  isInvalid={wordTwelve !== seedphrase[11] && wordTwelve.length > 0}
                  isValid={wordTwelve === seedphrase[11]}
                  required
                />
                {wordTwelve === seedphrase[11] && !seedBackup && (
                  <rb.Form.Control.Feedback>Word matches!</rb.Form.Control.Feedback>
                )}
                {wordTwelve !== seedphrase[11] && wordTwelve.length > 0 && (
                  <rb.Form.Control.Feedback type="invalid">Word does not match.</rb.Form.Control.Feedback>
                )}
              </rb.InputGroup>
            </div>
          </div>
        </div>
      </rb.Form>
      {seedBackup && <div className="text-center text-success">Seed phrase confirmed.</div>}

      <div className="d-flex mt-4 mb-4 gap-3">
        <rb.Button
          variant="dark"
          disabled={seedBackup}
          onClick={() => {
            parentStepSetter()
          }}
        >
          Back
        </rb.Button>

        <rb.Button variant="dark" onClick={() => userConfirmed && walletConfirmed()} disabled={!seedBackup}>
          Fund wallet
        </rb.Button>
      </div>

      <rb.Button variant="outline-dark" onClick={() => userConfirmed && walletConfirmed()} disabled={seedBackup}>
        Skip
      </rb.Button>
    </div>
  )
}

const WalletCreationConfirmation = ({ createdWallet, walletConfirmed }) => {
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
      <BackupConfirmation
        parentStepSetter={childStepSetter}
        createdWallet={createdWallet}
        walletConfirmed={walletConfirmed}
        userConfirmed={userConfirmed}
      />
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
