import * as rb from 'react-bootstrap'
import React, { useState } from 'react'
import Sprite from './Sprite'
import { useSettingsDispatch } from '../context/SettingsContext'

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const settingsDispatch = useSettingsDispatch()

  const next = () => {
    if (step < steps.length) {
      setStep(step + 1)
    } else {
      settingsDispatch({ showOnboarding: false })
    }
  }

  const steps = [
    {
      title: 'Welcome to Jam for JoinMarket!',
      description:
        'JoinMarket is a privacy-focused software solution that aims to improve the confidentiality and privacy of your bitcoin transactions. It facilitates the creation of collaborative transactions through a peer-to-peer marketplace.',
      icon: 'welcome',
    },
    {
      title: 'Collaborative Transactions',
      description:
        'To have strong privacy guarantees in the open and transparent world of bitcoin, special kinds of transactions have to be created. JoinMarket helps you to create these transactions in an easy and automated way.',
      icon: 'collab',
    },
    {
      title: 'You Are In Control',
      description:
        'JoinMarket is fully non-custodial, meaning that you always have full control over your funds. The system uses Bitcoin’s smart contracts to make sure that all transactions are atomic and your funds are secure at all times.',
      icon: 'key',
    },
    {
      title: 'No Trusted Third Parties',
      description:
        'Since JoinMarket is a peer-to-peer system, trusted third parties are eliminated from the get-go. This unique market-driven approach reduces counterparty risk to a minimum.',
      icon: 'handshake',
    },
    {
      title: 'Privacy for All',
      description:
        'JoinMarket is free and open-source software without a single point of failure. Everyone is free to use it and build upon it.',
      icon: 'shield-outline',
    },
  ]

  if (step === 0) {
    return (
      <div>
        <div className="d-flex justify-content-center">
          <Sprite symbol="logo" width="8rem" height="8rem" className="mb-4" />
        </div>
        <h1 className="text-center">Jam</h1>
        <h2 className="text-center fw-normal text-secondary mb-5">A friendly UI for JoinMarket</h2>
        <div className="d-flex justify-content-center mb-2">
          <rb.Button size="lg" variant="dark" onClick={next}>
            Get started
          </rb.Button>
        </div>
        <div className="d-flex justify-content-center">
          <rb.Button size="lg" variant="outline-dark" onClick={() => settingsDispatch({ showOnboarding: false })}>
            Skip intro
          </rb.Button>
        </div>
        <p className="mt-4 text-center text-secondary">
          Your wallet, your coins. <br />
          100% open-source & open-design.
        </p>
        <div className="mt-4 text-secondary text-center">
          <div className="fw-bolder">Warning</div>
          <div>
            While JoinMarket is tried and tested, Jam is not. It is in a pre-alpha stage and currently does not offer
            the same functionality and privacy guarantees as existing JoinMarket tools. If anything breaks please{' '}
            <a
              href="https://github.com/joinmarket-webui/joinmarket-webui/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="link-secondary"
            >
              report an issue
            </a>{' '}
            on GitHub.
          </div>
        </div>
      </div>
    )
  } else {
    const content = steps[step - 1]

    return (
      <>
        <div className="flex-1">
          <div className="d-flex justify-content-center">
            <Sprite symbol={content.icon} width="5rem" height="5rem" className="mb-4" />
          </div>
          <h2 className="text-center mb-3">{content.title}</h2>
          <p className="description text-center text-secondary mb-5">{content.description}</p>
        </div>
        <div className="button d-flex justify-content-center">
          <rb.Button size="lg" variant="dark" onClick={next}>
            {step === steps.length ? "Let's go!" : 'Next'}
          </rb.Button>
        </div>
      </>
    )
  }
}
