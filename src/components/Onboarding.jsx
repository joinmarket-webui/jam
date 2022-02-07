import * as rb from 'react-bootstrap'
import React, { useState } from 'react'
import Sprite from './Sprite'

export default function Onboarding() {
  const [step, setStep] = useState(0)

  if (step === 0) {
    return (
      <div class="mx-auto my-auto">
        <div class="d-flex justify-content-center">
          <Sprite symbol="logo" width="200" height="200" className="mb-4" />
        </div>
        <h1 class="text-center">JoinMarket</h1>
        <p class="text-center fs-4 text-secondary mb-5">Top-notch privacy for your bitcoin.</p>
        <div class="d-flex justify-content-center">
          <rb.Button variant="dark" onClick={() => setStep(1)}>
            Get started
          </rb.Button>
        </div>
        <p class="mt-4 text-center">
          Your wallet, your coins. <br />
          100% open-source & open-design.
        </p>
      </div>
    )
  } else if (step === 1) {
    return (
      <div class="mx-auto my-auto col-12 col-md-4">
        <div class="d-flex justify-content-center">
          <Sprite symbol="welcome" width="100" height="100" className="mb-4" />
        </div>
        <p class="fs-3 text-center">1: Welcome to JoinMarket!</p>
        <p class="text-center text-secondary mb-5">
          JoinMarket is a privacy-focused software solution that aims to improve the confidentiality and privacy of your
          bitcoin transactions. It facilitates the creation of collaborative transactions through a peer-to-peer
          marketplace. <br />
          <br />
          ⚠️ Warning: While JoinMarket is tried and tested, this user interface is not. If anything breaks please{' '}
          <a href="https://github.com/joinmarket-webui/joinmarket-webui/issues" target="_blank" rel="noreferrer">
            report an issue
          </a>{' '}
          on GitHub.
        </p>
        <div class="d-flex justify-content-center">
          <rb.Button variant="dark" onClick={() => setStep(2)}>
            Continue
          </rb.Button>
        </div>
      </div>
    )
  } else if (step === 2) {
    return (
      <div class="mx-auto my-auto col-12 col-md-4">
        <div class="d-flex justify-content-center">
          <Sprite symbol="collab" width="100" height="100" className="mb-4" />
        </div>
        <p class="fs-3 text-center">2: Collaborative Transactions</p>
        <p class="text-center text-secondary mb-5">
          To have strong privacy guarantees in the open and transparent world of bitcoin, special kinds of transactions
          have to be created. JoinMarket helps you to create these transactions in an easy and automated way.
        </p>
        <div class="d-flex justify-content-center">
          <rb.Button variant="dark" onClick={() => setStep(3)}>
            Continue
          </rb.Button>
        </div>
      </div>
    )
  } else if (step === 3) {
    return (
      <div class="mx-auto my-auto col-12 col-md-4">
        <div class="d-flex justify-content-center">
          <Sprite symbol="key" width="100" height="100" className="mb-4" />
        </div>
        <p class="fs-3 text-center">3: You Are In Control</p>
        <p class="text-center text-secondary mb-5">
          JoinMarket is fully non-custodial, meaning that you always have full control over your funds. The system uses
          Bitcoin’s smart contracts to make sure that all transactions are atomic and your funds are secure at all
          times.
        </p>
        <div class="d-flex justify-content-center">
          <rb.Button variant="dark" onClick={() => setStep(4)}>
            Continue
          </rb.Button>
        </div>
      </div>
    )
  } else if (step === 4) {
    return (
      <div class="mx-auto my-auto col-12 col-md-4">
        <div class="d-flex justify-content-center">
          <Sprite symbol="handshake" width="100" height="100" className="mb-4" />
        </div>
        <p class="fs-3 text-center">4. No Trusted Third Parties</p>
        <p class="text-center text-secondary mb-5">
          Since JoinMarket is a peer-to-peer system, trusted third parties are eliminated from the get-go. This unique
          market-driven approach reduces counterparty risk to a minimum.
        </p>
        <div class="d-flex justify-content-center">
          <rb.Button variant="dark" onClick={() => setStep(5)}>
            Continue
          </rb.Button>
        </div>
      </div>
    )
  } else if (step === 5) {
    return (
      <div class="mx-auto my-auto col-12 col-md-4">
        <div class="d-flex justify-content-center">
          <Sprite symbol="shield" width="100" height="100" className="mb-4" />
        </div>
        <p class="fs-3 text-center">5: Privacy for All</p>
        <p class="text-center text-secondary mb-5">
          JoinMarket is free and open-source software without a single point of failure. Everyone is free to use it and
          build upon it.
        </p>
        <div class="d-flex justify-content-center">
          <rb.Button variant="dark" onClick={() => setStep(0)}>
            Continue
          </rb.Button>
        </div>
      </div>
    )
  }
}
