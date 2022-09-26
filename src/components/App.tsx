import { useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import { routes } from '../constants/routes'
import { useSessionConnectionError } from '../context/ServiceInfoContext'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useSetCurrentWallet } from '../context/WalletContext'
import { clearSession, setSession } from '../session'
import CreateWallet from './CreateWallet'
import Earn from './Earn'
import Footer from './Footer'
import Jam from './Jam'
import Layout from './Layout'
import MainWalletView from './MainWalletView'
import Navbar from './Navbar'
import Onboarding from './Onboarding'
import Receive from './Receive'
import Send from './Send'
import Settings from './Settings'
import Wallets from './Wallets'

export default function App() {
  const { t } = useTranslation()
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const sessionConnectionError = useSessionConnectionError()

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
                <Route
                  path={routes.home}
                  element={<Wallets currentWallet={currentWallet} startWallet={startWallet} stopWallet={stopWallet} />}
                />
                {currentWallet && (
                  <>
                    <Route path={routes.wallet} element={<MainWalletView />} />
                    <Route path={routes.jam} element={<Jam />} />
                    <Route path={routes.send} element={<Send />} />
                    <Route path={routes.earn} element={<Earn />} />
                    <Route path={routes.receive} element={<Receive />} />
                    <Route path={routes.settings} element={<Settings stopWallet={stopWallet} />} />
                  </>
                )}
              </Route>
              <Route path="*" element={<Navigate to={routes.home} replace={true} />} />
            </>
          )}
        </Routes>
      </rb.Container>
      <Footer />
    </>
  )
}
