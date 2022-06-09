import React, { useState, useEffect, useCallback } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import Wallets from './Wallets'
import CreateWallet from './CreateWallet'
import Jam from './Jam'
import Send from './Send'
import Earn from './Earn'
import Receive from './Receive'
import CurrentWalletMagic from './CurrentWalletMagic'
import CurrentWalletAdvanced from './CurrentWalletAdvanced'
import Settings from './Settings'
import Navbar from './Navbar'
import Layout from './Layout'
import Sprite from './Sprite'
import { useSettings, useSettingsDispatch } from '../context/SettingsContext'
import { useWebsocketState } from '../context/WebsocketContext'
import { useCurrentWallet, useSetCurrentWallet } from '../context/WalletContext'
import { useSessionConnectionError } from '../context/ServiceInfoContext'
import { setSession, clearSession } from '../session'
import Onboarding from './Onboarding'
import Cheatsheet from './Cheatsheet'
import { routes } from '../constants/routes'
import packageInfo from '../../package.json'

export default function App() {
  const { t } = useTranslation()
  const settings = useSettings()
  const settingsDispatch = useSettingsDispatch()
  const websocketState = useWebsocketState()
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const sessionConnectionError = useSessionConnectionError()

  const [websocketConnected, setWebsocketConnected] = useState()
  const [showAlphaWarning, setShowAlphaWarning] = useState(false)
  const [showCheatsheet, setShowCheatsheet] = useState(false)

  const cheatsheetEnabled = currentWallet

  const startWallet = useCallback(
    (name, token) => {
      setSession({ name, token })
      setCurrentWallet({ name, token })
    },
    [setCurrentWallet]
  )

  const stopWallet = useCallback(() => {
    clearSession()
    setCurrentWallet(null)
  }, [setCurrentWallet])

  // update the connection indicator based on the websocket connection state
  useEffect(() => {
    setWebsocketConnected(websocketState === WebSocket.OPEN)
  }, [websocketState])

  useEffect(() => {
    let timer
    // show the cheatsheet once after the first wallet has been created
    if (cheatsheetEnabled && settings.showCheatsheet) {
      timer = setTimeout(() => {
        setShowCheatsheet(true)
        settingsDispatch({ showCheatsheet: false })
      }, 1_000)
    }

    return () => clearTimeout(timer)
  }, [cheatsheetEnabled, settings, settingsDispatch])

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
      <rb.Container as="main" className="py-4 py-sm-5">
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
            <Route path={routes.createWallet} element={<CreateWallet startWallet={startWallet} />} />
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
                    <Route path={routes.jam} element={<Jam />} />
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
        <rb.Container fluid="xl" className="d-flex justify-content-center py-2 px-4">
          <div className="d-none d-md-flex flex-1 order-0 justify-content-start align-items-center">
            <div className="warning-hint text-start text-secondary">
              <Trans i18nKey="footer.warning">
                This is beta software.
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
          <div className="d-flex order-1 flex-1 flex-grow-0 justify-content-center align-items-center pt-0">
            {cheatsheetEnabled && (
              <div className="order-1 order-sm-0">
                <Cheatsheet show={showCheatsheet} onHide={() => setShowCheatsheet(false)} />
                <rb.Nav.Item>
                  <rb.Button
                    variant="link"
                    className="cheatsheet-link nav-link text-start border-0 px-2"
                    onClick={() => setShowCheatsheet(true)}
                  >
                    <div className="d-flex justify-content-center align-items-center">
                      <Sprite symbol="file" width="24" height="24" />
                      <div className="ps-0">{t('footer.cheatsheet')}</div>
                    </div>
                  </rb.Button>
                </rb.Nav.Item>
              </div>
            )}
          </div>
          <div className="d-flex flex-1 order-2 justify-content-end align-items-center gap-1">
            <div className="warning-hint text-start text-secondary d-none d-md-block pe-1">
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui/tags"
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-secondary"
              >
                {' '}
                v{packageInfo.version}
              </a>
            </div>
            <div className="d-flex gap-2 pe-2">
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui"
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-secondary"
              >
                <Sprite symbol="github" width="18px" height="18px" />
              </a>
              <a
                href="https://t.me/JoinMarketWebUI"
                target="_blank"
                rel="noopener noreferrer"
                className="d-flex align-items-center text-secondary"
              >
                <Sprite symbol="telegram" width="18px" height="18px" />
              </a>
            </div>
            <div className="d-flex text-secondary">|</div>
            <div className="d-flex">
              <rb.OverlayTrigger
                delay={{ hide: 300, show: 200 }}
                placement="top"
                overlay={(props) => (
                  <rb.Tooltip {...props}>
                    {websocketConnected ? t('footer.connected') : t('footer.disconnected')}
                  </rb.Tooltip>
                )}
              >
                <span
                  className={`mx-1 ${websocketConnected ? 'text-success' : 'text-danger'}`}
                  data-testid="connection-indicator-icon"
                >
                  <Sprite symbol="node" width="24px" height="24px" />
                </span>
              </rb.OverlayTrigger>
            </div>
          </div>
        </rb.Container>
      </rb.Nav>
    </>
  )
}
