import * as rb from 'react-bootstrap'
import React, { useState } from 'react'
import Sprite from './Sprite'
import { useSettingsDispatch } from '../context/SettingsContext'

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const settingsDispatch = useSettingsDispatch()

  if (step === 0) {
    return (
      <div className="mx-auto my-auto py-5">
        <div className="d-flex justify-content-center">
          <Sprite symbol="logo" width="200" height="200" className="mb-4" />
        </div>
        <h1 className="text-center">JoinMarket</h1>
        <p className="text-center fs-4 text-secondary mb-5">Top-notch privacy for your bitcoin.</p>
        <div className="d-flex justify-content-center mb-2">
          <rb.Button size="lg" className="col-10" variant="dark" onClick={() => setStep(1)}>
            Get started
          </rb.Button>
        </div>
        <div className="d-flex justify-content-center">
          <rb.Button
            size="lg"
            className="col-10"
            variant="outline-dark"
            onClick={() => settingsDispatch({ showOnboarding: false })}
          >
            Skip intro
          </rb.Button>
        </div>
        <p className="mt-4 text-center">
          Your wallet, your coins. <br />
          100% open-source & open-design.
        </p>
      </div>
    )
  } else if (step === 1) {
    return (
      <div className="mx-auto my-auto py-5 col-10 col-md-4">
        <div className="d-flex justify-content-center">
          <Sprite symbol="welcome" width="150" height="150" className="mb-4" />
        </div>
        <p className="fs-3 text-center">Welcome to JoinMarket!</p>
        <p className="text-center text-secondary mb-5">
          JoinMarket is a privacy-focused software solution that aims to improve the confidentiality and privacy of your
          bitcoin transactions. It facilitates the creation of collaborative transactions through a peer-to-peer
          marketplace. <br />
          <br />
          ⚠️ Warning: While JoinMarket is tried and tested, this user interface is not. If anything breaks please{' '}
          <a
            href="https://github.com/joinmarket-webui/joinmarket-webui/issues"
            target="_blank"
            rel="noreferrer"
            className="link-secondary"
          >
            report an issue
          </a>{' '}
          on GitHub.
        </p>
        <div className="d-flex justify-content-center">
          <rb.Button size="lg" className="col-6" variant="dark" onClick={() => setStep(2)}>
            Next
          </rb.Button>
        </div>
      </div>
    )
  } else if (step === 2) {
    return (
      <div className="mx-auto my-auto py-5 col-10 col-md-4">
        <div className="d-flex justify-content-center">
          <Sprite symbol="collab" width="150" height="150" className="mb-4" />
        </div>
        <p className="fs-3 text-center">Collaborative Transactions</p>
        <p className="text-center text-secondary mb-5">
          To have strong privacy guarantees in the open and transparent world of bitcoin, special kinds of transactions
          have to be created. JoinMarket helps you to create these transactions in an easy and automated way.
        </p>
        <div className="d-flex justify-content-center">
          <rb.Button size="lg" className="col-6" variant="dark" onClick={() => setStep(3)}>
            Next
          </rb.Button>
        </div>
      </div>
    )
  } else if (step === 3) {
    return (
      <div className="mx-auto my-auto py-5 col-10 col-md-4">
        <div className="d-flex justify-content-center">
          <Sprite symbol="key" width="150" height="150" className="mb-4" />
        </div>
        <p className="fs-3 text-center">You Are In Control</p>
        <p className="text-center text-secondary mb-5">
          JoinMarket is fully non-custodial, meaning that you always have full control over your funds. The system uses
          Bitcoin’s smart contracts to make sure that all transactions are atomic and your funds are secure at all
          times.
        </p>
        <div className="d-flex justify-content-center">
          <rb.Button size="lg" className="col-6" variant="dark" onClick={() => setStep(4)}>
            Next
          </rb.Button>
        </div>
      </div>
    )
  } else if (step === 4) {
    return (
      <div className="mx-auto my-auto py-5 col-10 col-md-4">
        <div className="d-flex justify-content-center">
          <Sprite symbol="handshake" width="150" height="150" className="mb-4" />
        </div>
        <p className="fs-3 text-center">No Trusted Third Parties</p>
        <p className="text-center text-secondary mb-5">
          Since JoinMarket is a peer-to-peer system, trusted third parties are eliminated from the get-go. This unique
          market-driven approach reduces counterparty risk to a minimum.
        </p>
        <div className="d-flex justify-content-center">
          <rb.Button size="lg" className="col-6" variant="dark" onClick={() => setStep(5)}>
            Next
          </rb.Button>
        </div>
      </div>
    )
  } else if (step === 5) {
    return (
      <div className="mx-auto my-auto py-5 col-10 col-md-4">
        <div className="d-flex justify-content-center">
          <Sprite symbol="shield-filled" width="150" height="150" className="mb-4" />
        </div>
        <p className="fs-3 text-center">Privacy for All</p>
        <p className="text-center text-secondary mb-5">
          JoinMarket is free and open-source software without a single point of failure. Everyone is free to use it and
          build upon it.
        </p>
        <div className="d-flex justify-content-center">
          <rb.Button
            size="lg"
            className="col-6"
            variant="dark"
            onClick={() => {
              settingsDispatch({ showOnboarding: false })
            }}
          >
            Let's go!
          </rb.Button>
        </div>
      </div>
    )
  }
}
