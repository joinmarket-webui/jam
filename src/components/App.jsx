import React, { useState, useEffect, useCallback } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import Wallets from './Wallets'
import CreateWallet from './CreateWallet'
import Send from './Send'
import Earn from './Earn'
import Receive from './Receive'
import CurrentWalletMagic from './CurrentWalletMagic'
import CurrentWalletAdvanced from './CurrentWalletAdvanced'
import Settings from './Settings'
import Navbar from './Navbar'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useSetCurrentWallet, useSetCurrentWalletInfo } from '../context/WalletContext'
import { getSession, setSession, clearSession } from '../session'
import * as Api from '../libs/JmWalletApi'

import Onboarding from './Onboarding'

export default function App() {
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const setCurrentWalletInfo = useSetCurrentWalletInfo()

  const [makerRunning, setMakerRunning] = useState()
  const [connectionError, setConnectionError] = useState()
  const [coinjoinInProcess, setCoinjoinInProcess] = useState()
  const [showAlphaWarning, setShowAlphaWarning] = useState(false)
  const settings = useSettings()

  const startWallet = useCallback(
    (name, token) => {
      setSession(name, token)
      setCurrentWallet({ name, token })
    },
    [setCurrentWallet]
  )

  const stopWallet = () => {
    clearSession()
    setCurrentWallet(null)
    setCurrentWalletInfo(null)
  }

  useEffect(() => {
    const abortCtrl = new AbortController()

    const resetState = () => {
      setCurrentWallet(null)
      setCurrentWalletInfo(null)
      setMakerRunning(null)
      setCoinjoinInProcess(null)
    }

    const refreshSession = () => {
      Api.getSession({ signal: abortCtrl.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
        .then((data) => {
          const { maker_running, coinjoin_in_process, wallet_name } = data
          const activeWallet = wallet_name !== 'None' ? wallet_name : null

          setConnectionError(null)
          setMakerRunning(maker_running)
          setCoinjoinInProcess(coinjoin_in_process)
          if (currentWallet && (!activeWallet || currentWallet.name !== activeWallet)) {
            setCurrentWallet(null)
            setCurrentWalletInfo(null)
            clearSession()
          }
        })
        .catch((err) => {
          if (!abortCtrl.signal.aborted) {
            setConnectionError(err.message)
            resetState()
          }
        })
    }
    refreshSession()
    const interval = setInterval(refreshSession, 10000)
    return () => {
      abortCtrl.abort()
      clearInterval(interval)
    }
  }, [currentWallet, setCurrentWallet, setCurrentWalletInfo])

  useEffect(() => {
    const session = getSession()
    if (session) {
      return startWallet(session.name, session.token)
    }
  }, [startWallet])

  if (settings.showOnboarding === true) {
    return <Onboarding />
  }
  return (
    <>
      {showAlphaWarning && (
        <div className="warning-card-wrapper">
          <rb.Card className="warning-card translate-middle shadow-lg">
            <rb.Card.Body>
              <rb.Card.Title className="text-center mb-3">Warning</rb.Card.Title>
              <p className="text-secondary">
                While JoinMarket is tried and tested, this user interface is not. It is in a pre-alpha stage and
                currently does not offer the same functionality and privacy guarantees as existing JoinMarket tools.
              </p>
              <div className="text-center mt-3">
                <rb.Button variant="secondary" onClick={() => setShowAlphaWarning(false)}>
                  Fine with me.
                </rb.Button>
              </div>
            </rb.Card.Body>
          </rb.Card>
        </div>
      )}
      <Navbar coinjoinInProcess={coinjoinInProcess} makerRunning={makerRunning} connectionError={connectionError} />
      <rb.Container as="main" className="py-5">
        {connectionError ? (
          <rb.Alert variant="danger">No connection to backend: {connectionError}.</rb.Alert>
        ) : (
          <Routes>
            <Route exact path="/" element={<Wallets startWallet={startWallet} stopWallet={stopWallet} />} />
            <Route
              path="create-wallet"
              element={<CreateWallet currentWallet={currentWallet} startWallet={startWallet} />}
            />
            {currentWallet && (
              <>
                <Route
                  path="wallet"
                  element={settings.useAdvancedWalletMode ? <CurrentWalletAdvanced /> : <CurrentWalletMagic />}
                />
                <Route
                  path="send"
                  element={<Send makerRunning={makerRunning} coinjoinInProcess={coinjoinInProcess} />}
                />
                <Route
                  path="earn"
                  element={
                    <Earn
                      currentWallet={currentWallet}
                      coinjoinInProcess={coinjoinInProcess}
                      makerRunning={makerRunning}
                    />
                  }
                />
                <Route path="receive" element={<Receive currentWallet={currentWallet} />} />
                <Route path="settings" element={<Settings currentWallet={currentWallet} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" replace={true} />} />
          </Routes>
        )}
      </rb.Container>
      <rb.Nav as="footer" className="border-top py-2">
        <rb.Container fluid="xl" className="d-flex flex-column flex-md-row justify-content-center py-2 px-4">
          <div className="d-flex flex-1 order-2 order-md-0 flex-column justify-content-center align-items-center align-items-md-start">
            <div className="warning-hint text-start text-secondary d-none d-md-block">This is pre-alpha software.</div>
            <rb.Button
              variant="link"
              className="warning-hint text-start border-0 p-0 text-secondary"
              onClick={() => setShowAlphaWarning(true)}
            >
              Read this before using.
            </rb.Button>
          </div>
          <div className="d-flex order-1 flex-1 flex-grow-0 justify-content-center align-items-center px-4">
            <rb.Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui/wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                Docs
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui#-features"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                Features
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                GitHub
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://twitter.com/joinmarket"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                Twitter
              </a>
            </rb.Nav.Item>
          </div>
          {connectionError ? (
            <div className="d-flex order-0 order-md-2 flex-1 justify-content-center justify-content-md-end align-items-center">
              <span className="text-danger mx-1">•</span>
              <span className="text-secondary">Disconnected</span>
            </div>
          ) : (
            <div className="d-flex order-0 order-md-2 flex-1 justify-content-center justify-content-md-end align-items-center">
              <span className="text-success mx-1">•</span>
              <span className="text-secondary">Connected</span>
            </div>
          )}
        </rb.Container>
      </rb.Nav>
    </>
  )
}
