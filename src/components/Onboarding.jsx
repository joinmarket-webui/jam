import logo from '../assets/logo.png'
import * as rb from 'react-bootstrap'
import React, { useState } from 'react'

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
      <div class="mx-auto my-auto">
        <p class="fs-3 text-center">Intro copy</p>
        <p class="text-center text-secondary mb-5">
          Explainer what this app does for the user, core concepts, features...
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
