import { useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
  Outlet,
} from 'react-router-dom'
import classNames from 'classnames'
import * as Api from '../libs/JmWalletApi'
import { routes } from '../constants/routes'
import { useServiceInfo, useSessionConnectionError } from '../context/ServiceInfoContext'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet, useSetCurrentWallet } from '../context/WalletContext'
import { clearSession, setSession } from '../session'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import CreateWallet from './CreateWallet'
import ImportWallet from './ImportWallet'
import Earn from './Earn'
import ErrorPage, { ErrorThrowingComponent } from './ErrorPage'
import Footer from './Footer'
import Jam from './Jam'
import Layout from './Layout'
import MainWalletView from './MainWalletView'
import Navbar from './Navbar'
import Onboarding from './Onboarding'
import Receive from './Receive'
import Send from './Send'
import RescanChain from './RescanChain'
import Settings from './Settings'
import Wallets from './Wallets'

export default function App() {
  const { t } = useTranslation()
  const settings = useSettings()
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const serviceInfo = useServiceInfo()
  const sessionConnectionError = useSessionConnectionError()

  const startWallet = useCallback(
    (name: Api.WalletName, token: Api.ApiToken) => {
      setSession({ name, token })
      setCurrentWallet({ name, token })
    },
    [setCurrentWallet]
  )

  const stopWallet = useCallback(() => {
    clearSession()
    setCurrentWallet(null)
  }, [setCurrentWallet])

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route
        id="base"
        element={
          <>
            <Navbar />
            <rb.Container as="main" className="py-4 py-sm-5">
              <Outlet />
            </rb.Container>
            <Footer />
          </>
        }
        errorElement={<ErrorPage />}
      >
        <Route
          id="error-boundary"
          element={
            <Layout>
              <Outlet />
            </Layout>
          }
          errorElement={
            <Layout variant="wide">
              <ErrorPage />
            </Layout>
          }
        >
          {/**
           * This sections defines all routes that can be displayed, even if the connection
           * to the backend is down, e.g. "create-wallet" shows the seed quiz and it is important
           * that it stays visible in case the backend becomes unavailable.
           */}
          <Route
            id="create-wallet"
            path={routes.createWallet}
            element={<CreateWallet parentRoute={'home'} startWallet={startWallet} />}
          />

          {sessionConnectionError ? (
            <Route
              id="404"
              path="*"
              element={
                <rb.Alert variant="danger">
                  {t('app.alert_no_connection', { connectionError: sessionConnectionError.message })}.
                </rb.Alert>
              }
            />
          ) : (
            <>
              {/**
               * This section defines all routes that are displayed only if the backend is reachable.
               */}
              <Route
                id="wallets"
                path={routes.home}
                element={<Wallets currentWallet={currentWallet} startWallet={startWallet} stopWallet={stopWallet} />}
              />
              <Route
                id="import-wallet"
                path={routes.importWallet}
                element={<ImportWallet parentRoute={'home'} startWallet={startWallet} />}
              />
              {currentWallet && (
                <>
                  <Route id="wallet" path={routes.wallet} element={<MainWalletView wallet={currentWallet} />} />
                  <Route id="jam" path={routes.jam} element={<Jam wallet={currentWallet} />} />
                  <Route id="send" path={routes.send} element={<Send wallet={currentWallet} />} />
                  <Route id="earn" path={routes.earn} element={<Earn wallet={currentWallet} />} />
                  <Route id="receive" path={routes.receive} element={<Receive wallet={currentWallet} />} />
                  <Route id="rescan" path={routes.rescanChain} element={<RescanChain wallet={currentWallet} />} />
                  <Route
                    id="settings"
                    path={routes.settings}
                    element={<Settings wallet={currentWallet} stopWallet={stopWallet} />}
                  />
                </>
              )}
              {isDebugFeatureEnabled('errorExamplePage') && (
                <Route id="error-example" path={routes.__errorExample} element={<ErrorThrowingComponent />} />
              )}
              <Route id="404" path="*" element={<Navigate to={routes.home} replace={true} />} />
            </>
          )}
        </Route>
      </Route>
    ),
    {
      basename: window.JM.PUBLIC_PATH,
    }
  )

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
    <div
      className={classNames('app', {
        'jm-coinjoin-in-progress': serviceInfo?.coinjoinInProgress === true,
        'jm-rescan-in-progress': serviceInfo?.rescanning === true,
        'jm-maker-running': serviceInfo?.makerRunning === true,
      })}
    >
      <RouterProvider router={router} />
    </div>
  )
}
