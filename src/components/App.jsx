import React, { useState, useEffect, useCallback } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
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
import { useCurrentWallet, useSetCurrentWallet, useSetCurrentWalletInfo } from '../context/WalletContext'
import { useSessionConnectionError } from '../context/ServiceInfoContext'
import { setSession, clearSession } from '../session'
import Onboarding from './Onboarding'
import Nav from 'react-bootstrap/Nav'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Card from 'react-bootstrap/Card'
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'

export default function App() {
  const { t } = useTranslation()
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const setCurrentWalletInfo = useSetCurrentWalletInfo()
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
    setCurrentWalletInfo(null)
  }

  // update the connection indicator based on the websocket connection state
  useEffect(() => {
    setWebsocketConnected(websocketState === WebSocket.OPEN)
  }, [websocketState])

  if (settings.showOnboarding === true) {
    return (
      <Container className="onboarding my-5">
        <Row className="justify-content-center mt-md-5">
          <Col xs={10} sm={10} md={8} lg={6} xl={4}>
            <Onboarding />
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <>
      {showAlphaWarning && (
        <div className="warning-card-wrapper">
          <Card className="warning-card translate-middle shadow-lg">
            <Card.Body>
              <Card.Title className="text-center mb-3">{t('footer.warning_alert_title')}</Card.Title>
              <p className="text-secondary">{t('footer.warning_alert_text')}</p>
              <div className="text-center mt-3">
                <Button variant="secondary" onClick={() => setShowAlphaWarning(false)}>
                  {t('footer.warning_alert_button_ok')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
      <Navbar />
      <Container as="main" className="py-5">
        {sessionConnectionError ? (
          <Alert variant="danger">
            {t('app.alert_no_connection', { connectionError: sessionConnectionError.message })}.
          </Alert>
        ) : (
          <Routes>
            <Route element={<Layout />}>
              <Route exact path="/" element={<Wallets startWallet={startWallet} stopWallet={stopWallet} />} />
              <Route path="create-wallet" element={<CreateWallet startWallet={startWallet} devMode={devMode} />} />
              {currentWallet && (
                <>
                  <Route path="send" element={<Send />} />
                  <Route path="earn" element={<Earn />} />
                  <Route path="receive" element={<Receive />} />
                  <Route path="settings" element={<Settings />} />
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
      </Container>
      <Nav as="footer" className="border-top py-2">
        <Container fluid="xl" className="d-flex flex-column flex-md-row justify-content-center py-2 px-4">
          <div className="d-flex flex-1 order-2 order-md-0 flex-column justify-content-center align-items-center align-items-md-start">
            <div className="warning-hint text-start text-secondary d-none d-md-block">
              <Trans i18nKey="footer.warning">
                This is pre-alpha software.
                <Button
                  variant="link"
                  className="warning-hint text-start border-0 p-0 text-secondary"
                  onClick={() => setShowAlphaWarning(true)}
                >
                  Read this before using.
                </Button>
              </Trans>
            </div>
          </div>
          <div className="d-flex order-1 flex-1 flex-grow-0 justify-content-center align-items-center px-4">
            <Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui/wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                {t('footer.docs')}
              </a>
            </Nav.Item>
            <Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui#-features"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                {t('footer.features')}
              </a>
            </Nav.Item>
            <Nav.Item>
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                {t('footer.github')}
              </a>
            </Nav.Item>
            <Nav.Item>
              <a
                href="https://twitter.com/joinmarket"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link text-secondary px-2"
              >
                {t('footer.twitter')}
              </a>
            </Nav.Item>
          </div>
          <div className="d-flex order-0 order-md-2 flex-1 justify-content-center justify-content-md-end align-items-center">
            <span className={`mx-1 ${websocketConnected ? 'text-success' : 'text-danger'}`}>•</span>
            <span className="text-secondary">
              {websocketConnected ? t('footer.connected') : t('footer.disconnected')}
            </span>
          </div>
        </Container>
      </Nav>
    </>
  )
}
