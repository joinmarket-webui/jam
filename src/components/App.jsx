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
import Layout from './Layout'
import { useSettings } from '../context/SettingsContext'
import { useWebsocketState } from '../context/WebsocketContext'
import { useCurrentWallet, useSetCurrentWallet, useSetCurrentWalletInfo } from '../context/WalletContext'
import { useSessionInfo, useSessionConnectionError } from '../context/SessionInfoContext'
import { setSession, clearSession } from '../session'
import * as Api from '../libs/JmWalletApi'
import Onboarding from './Onboarding'

// interval in milliseconds for periodic session requests
const SESSION_REQUEST_INTERVAL = 10_000

export default function App() {
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const setCurrentWalletInfo = useSetCurrentWalletInfo()
  const sessionInfo = useSessionInfo()
  const sessionConnectionError = useSessionConnectionError()

  const [websocketConnected, setWebsocketConnected] = useState()
  const [showAlphaWarning, setShowAlphaWarning] = useState(false)
  const settings = useSettings()
  const websocketState = useWebsocketState()

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

  // update the connection indicator based on the websocket connection state
  useEffect(() => {
    setWebsocketConnected(websocketState === WebSocket.OPEN)
  }, [websocketState])

  useEffect(() => {
    const abortCtrl = new AbortController()

    const resetState = () => {
      setCurrentWallet(null)
      setCurrentWalletInfo(null)
    }

    const refreshSession = () => {
      Api.getSession({ signal: abortCtrl.signal })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
        .then((data) => {
          const { maker_running, coinjoin_in_process, wallet_name } = data
          const activeWalletName = wallet_name !== 'None' ? wallet_name : null

          if (currentWallet && (!activeWalletName || currentWallet.name !== activeWalletName)) {
            setCurrentWallet(null)
            setCurrentWalletInfo(null)
            clearSession()
          }
        })
        .catch((err) => {
          if (!abortCtrl.signal.aborted) {
            resetState()
          }
        })
    }
    refreshSession()
    const interval = setInterval(refreshSession, SESSION_REQUEST_INTERVAL)
    return () => {
      abortCtrl.abort()
      clearInterval(interval)
    }
  }, [currentWallet, setCurrentWallet, setCurrentWalletInfo])

  if (settings.showOnboarding === true) {
    return (
      <rb.Container className="onboarding my-5">
        <rb.Row className="justify-content-center mt-md-5">
          <rb.Col xs={10} sm={10} md={8} lg={6} xl={4}>
            <Onboarding />
          </rb.Col>
        </rb.Row>
      </rb.Container>
    )
  }

  return (
    <>
      {showAlphaWarning && (
        <div className="warning-card-wrapper">
          <rb.Card className="warning-card translate-middle shadow-lg">
            <rb.Card.Body>
              <rb.Card.Title className="text-center mb-3">Warning</rb.Card.Title>
              <p className="text-secondary">
                While JoinMarket is tried and tested, Jam is not. It is in an alpha stage, so use with caution.
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
      <Navbar />
      <rb.Container as="main" className="py-5">
        {sessionConnectionError ? (
          <rb.Alert variant="danger">No connection to backend: {sessionConnectionError.message}.</rb.Alert>
        ) : (
          <Routes>
            <Route element={<Layout />}>
              <Route exact path="/" element={<Wallets startWallet={startWallet} stopWallet={stopWallet} />} />
              <Route
                path="create-wallet"
                element={<CreateWallet currentWallet={currentWallet} startWallet={startWallet} />}
              />
              {currentWallet && (
                <>
                  <Route
                    path="send"
                    element={
                      <Send
                        makerRunning={sessionInfo.maker_running}
                        coinjoinInProcess={sessionInfo.coinjoin_in_process}
                      />
                    }
                  />
                  <Route
                    path="earn"
                    element={
                      <Earn
                        currentWallet={currentWallet}
                        coinjoinInProcess={sessionInfo.coinjoin_in_process}
                        makerRunning={sessionInfo.maker_running}
                      />
                    }
                  />
                  <Route path="receive" element={<Receive currentWallet={currentWallet} />} />
                  <Route path="settings" element={<Settings currentWallet={currentWallet} />} />
                </>
              )}
            </Route>
            {currentWallet && !settings.useAdvancedWalletMode && (
              <Route element={<Layout variant="narrow" />}>
                <Route path="wallet" element={<CurrentWalletMagic />} />
              </Route>
            )}
            {currentWallet && settings.useAdvancedWalletMode && (
              <Route element={<Layout variant="wide" />}>
                <Route path="wallet" element={<CurrentWalletAdvanced />} />
              </Route>
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
          <div className="d-flex order-0 order-md-2 flex-1 justify-content-center justify-content-md-end align-items-center">
            <span className={`mx-1 ${websocketConnected ? 'text-success' : 'text-danger'}`}>•</span>
            <span className="text-secondary">{websocketConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </rb.Container>
      </rb.Nav>
    </>
  )
}
