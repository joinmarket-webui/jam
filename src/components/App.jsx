import React, { useState, useEffect, useCallback } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
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
import { useCurrentWallet, useSetCurrentWallet } from '../context/WalletContext'
import { useSessionConnectionError } from '../context/ServiceInfoContext'
import { setSession, clearSession } from '../session'
import Onboarding from './Onboarding'
import Sprite from './Sprite'
import { routes } from '../constants/routes'

export default function App() {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const sessionConnectionError = useSessionConnectionError()

  const [websocketConnected, setWebsocketConnected] = useState()
  const [showAlphaWarning, setShowAlphaWarning] = useState(false)
  const settings = useSettings()
  const websocketState = useWebsocketState()

  const devMode = process.env.NODE_ENV === 'development'

  const startWallet = useCallback(
    (name, token) => {
      setSession({ name, token })
      setCurrentWallet({ name, token })
    },
    [setCurrentWallet]
  )

  const stopWallet = () => {
    clearSession()
    setCurrentWallet(null)
  }

  // update the connection indicator based on the websocket connection state
  useEffect(() => {
    setWebsocketConnected(websocketState === WebSocket.OPEN)
  }, [websocketState])

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
              <rb.Card.Title className="text-center mb-3">{t('footer.warning_alert_title')}</rb.Card.Title>
              <p className="text-secondary">{t('footer.warning_alert_text')}</p>
              <div className="text-center mt-3">
                <rb.Button variant="secondary" onClick={() => setShowAlphaWarning(false)}>
                  {t('footer.warning_alert_button_ok')}
                </rb.Button>
              </div>
            </rb.Card.Body>
          </rb.Card>
        </div>
      )}
      <Navbar />
      <rb.Container as="main" className="py-5">
        {sessionConnectionError && (
          <rb.Alert variant="danger">
            {t('app.alert_no_connection', { connectionError: sessionConnectionError.message })}.
          </rb.Alert>
        )}
        <Routes>
          {/**
           * This sections defines all routes that can be displayed, even if the connection
           * to the backend is down, e.g. "create-wallet" shows the seed quiz and it is important
           * that it stays visible in case the backend becomes unavailable.
           */}
          <Route element={<Layout />}>
            <Route path={routes.createWallet} element={<CreateWallet startWallet={startWallet} devMode={devMode} />} />
          </Route>
          {/**
           * This section defines all routes that are displayed only if the backend is reachable.
           */}
          {!sessionConnectionError && (
            <>
              <Route element={<Layout />}>
                <Route path={routes.home} element={<Wallets startWallet={startWallet} stopWallet={stopWallet} />} />
                {currentWallet && (
                  <>
                    <Route path={routes.send} element={<Send />} />
                    <Route path={routes.earn} element={<Earn />} />
                    <Route path={routes.receive} element={<Receive />} />
                    <Route path={routes.settings} element={<Settings />} />
                  </>
                )}
              </Route>
              {currentWallet && !settings.useAdvancedWalletMode && (
                <Route element={<Layout variant="narrow" />}>
                  <Route path={routes.wallet} element={<CurrentWalletMagic />} />
                </Route>
              )}
              {currentWallet && settings.useAdvancedWalletMode && (
                <Route element={<Layout variant="wide" />}>
                  <Route path={routes.wallet} element={<CurrentWalletAdvanced />} />
                </Route>
              )}
              <Route path="*" element={<Navigate to={routes.home} replace={true} />} />
            </>
          )}
        </Routes>
      </rb.Container>
      <rb.Nav as="footer" className="border-top py-2">
        <rb.Container fluid="xl" className="d-flex flex-column flex-md-row justify-content-center py-2 px-4">
          <div className="d-flex flex-1 order-2 order-md-0 flex-column justify-content-center align-items-center align-items-md-start">
            <div className="warning-hint text-start text-secondary d-none d-md-block">
              <Trans i18nKey="footer.warning">
                This is pre-alpha software.
                <rb.Button
                  variant="link"
                  className="warning-hint text-start border-0 p-0 text-secondary"
                  onClick={() => setShowAlphaWarning(true)}
                >
                  Read this before using.
                </rb.Button>
              </Trans>
            </div>
          </div>
          <div className="d-flex order-1 flex-1 flex-grow-0 justify-content-center align-items-center px-4">
            <rb.Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui/wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                {t('footer.docs')}
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui#-features"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                {t('footer.features')}
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                {t('footer.github')}
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://twitter.com/joinmarket"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                {t('footer.twitter')}
              </a>
            </rb.Nav.Item>
          </div>
          <div className="d-flex order-0 order-md-2 flex-1 justify-content-center justify-content-md-end align-items-center">
            <span
              className={`mx-1 ${websocketConnected ? 'text-success' : 'text-danger'}`}
              data-testid="connection-indicator-icon"
            >
              <Sprite symbol="node" width="24px" height="24px" />
            </span>
            <span className="text-secondary">
              {websocketConnected ? t('footer.connected') : t('footer.disconnected')}
            </span>
          </div>
        </rb.Container>
      </rb.Nav>
    </>
  )
}
