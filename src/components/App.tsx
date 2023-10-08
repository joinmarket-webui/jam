import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  WalletInfo,
  CurrentWallet,
  useCurrentWallet,
  useSetCurrentWallet,
  useClearCurrentWallet,
  useReloadCurrentWalletInfo,
} from '../context/WalletContext'
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
  const clearCurrentWallet = useClearCurrentWallet()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()
  const serviceInfo = useServiceInfo()
  const sessionConnectionError = useSessionConnectionError()
  const [reloadingWalletInfoCounter, setReloadingWalletInfoCounter] = useState(0)
  const isReloadingWalletInfo = useMemo(() => reloadingWalletInfoCounter > 0, [reloadingWalletInfoCounter])

  const startWallet = useCallback(
    (name: Api.WalletName, auth: Api.ApiAuthContext) => {
      setSession({ name, auth })
      setCurrentWallet({ name, token: auth.token })
    },
    [setCurrentWallet],
  )

  const stopWallet = useCallback(() => {
    clearCurrentWallet()
    clearSession()
  }, [clearCurrentWallet])

  const reloadWalletInfo = useCallback(
    (delay: Milliseconds) => {
      setReloadingWalletInfoCounter((current) => current + 1)
      console.info('Reloading wallet info...')
      return new Promise<WalletInfo>((resolve, reject) =>
        setTimeout(() => {
          const abortCtrl = new AbortController()
          reloadCurrentWalletInfo
            .reloadAll({ signal: abortCtrl.signal })
            .then((result) => resolve(result))
            .catch((error) => reject(error))
            .finally(() => {
              console.info('Finished reloading wallet info.')
              setReloadingWalletInfoCounter((current) => current - 1)
            })
        }, delay),
      )
    },
    [reloadCurrentWalletInfo],
  )

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
      </Route>,
    ),
    {
      basename: window.JM.PUBLIC_PATH,
    },
  )

  if (settings.showOnboarding === true) {
    return (
      <rb.Container className="onboarding pt-3 pt-md-5">
        <rb.Row className="justify-content-center">
          <rb.Col xs={10} sm={10} md={8} lg={6} xl={4}>
            <Onboarding />
          </rb.Col>
        </rb.Row>
      </rb.Container>
    )
  }

  return (
    <>
      <div
        className={classNames('app', {
          'jam-reload-wallet-info-in-progress': isReloadingWalletInfo,
          'jm-coinjoin-in-progress': serviceInfo?.coinjoinInProgress === true,
          'jm-rescan-in-progress': serviceInfo?.rescanning === true,
          'jm-maker-running': serviceInfo?.makerRunning === true,
        })}
      >
        <RouterProvider router={router} />
      </div>
      <WalletInfoAutoReload currentWallet={currentWallet} reloadWalletInfo={reloadWalletInfo} />
    </>
  )
}

const RELOAD_WALLET_INFO_DELAY: {
  AFTER_RESCAN: Milliseconds
  AFTER_UNLOCK: Milliseconds
} = {
  // After rescanning, it is necessary to give the JM backend some time to synchronize.
  // A couple of seconds should be enough, however, this depends on the user hardware
  // and the delay might need to be increased if users encounter problems, e.g. the
  // balance changes again when switching views.
  // As reference: 4 seconds was not enough, even on regtest. But keep in mind, this only
  // takes effect after rescanning the chain, which should happen quite infrequently.
  AFTER_RESCAN: 8_000,

  // No delay is needed after normal unlock of wallet
  AFTER_UNLOCK: 0,
}

const MAX_RECURSIVE_WALLET_INFO_RELOADS = 10

interface WalletInfoAutoReloadProps {
  currentWallet: CurrentWallet | null
  reloadWalletInfo: (delay: Milliseconds) => Promise<WalletInfo>
}

/**
 * A component that automatically reloads wallet information on certain state changes,
 * e.g. when the wallet is unlocked or rescanning the chain finished successfully.
 *
 * If the auto-reloading on wallet change fails, the error can currently
 * only be logged and cannot be displayed to the user satisfactorily.
 * This might change in the future but is okay for now - components can
 * always trigger a reload on demand and inform the user as they see fit.
 */
const WalletInfoAutoReload = ({ currentWallet, reloadWalletInfo }: WalletInfoAutoReloadProps) => {
  const serviceInfo = useServiceInfo()
  const [previousRescanning, setPreviousRescanning] = useState(serviceInfo?.rescanning || false)
  const [currentRescanning, setCurrentRescanning] = useState(serviceInfo?.rescanning || false)
  const rescanningFinished = useMemo(
    () => previousRescanning === true && currentRescanning === false,
    [previousRescanning, currentRescanning],
  )

  useEffect(() => {
    setPreviousRescanning(currentRescanning)
    setCurrentRescanning(serviceInfo?.rescanning || false)
  }, [serviceInfo, currentRescanning])

  useEffect(
    function reloadAfterUnlock() {
      if (!currentWallet) return

      reloadWalletInfo(RELOAD_WALLET_INFO_DELAY.AFTER_UNLOCK).catch((err) => console.error(err))
    },
    [currentWallet, reloadWalletInfo],
  )

  useEffect(
    function reloadAfterRescan() {
      if (!currentWallet || !rescanningFinished) return

      // Hacky: If the balance changes after a reload, the backend might still not have been fully synchronized - try again!
      // Hint 1: Wallet might be empty after the first attempt
      // Hint 2: Just because wallet balance did not change, it does not mean everything has been found.
      const reloadWhileBalanceChangesRecursively = async (
        currentBalance: Api.AmountSats,
        delay: Milliseconds,
        maxCalls: number,
        callCounter: number = 0,
      ) => {
        if (callCounter >= maxCalls) return
        const info = await reloadWalletInfo(delay)
        const newBalance = info.balanceSummary.calculatedTotalBalanceInSats
        if (newBalance > currentBalance) {
          await reloadWhileBalanceChangesRecursively(newBalance, delay, maxCalls, callCounter++)
        }
      }

      reloadWalletInfo(RELOAD_WALLET_INFO_DELAY.AFTER_RESCAN)
        .then((info) =>
          reloadWhileBalanceChangesRecursively(
            info.balanceSummary.calculatedTotalBalanceInSats,
            RELOAD_WALLET_INFO_DELAY.AFTER_RESCAN,
            MAX_RECURSIVE_WALLET_INFO_RELOADS,
          ),
        )
        .catch((err) => console.error(err))
    },
    [currentWallet, rescanningFinished, reloadWalletInfo],
  )

  return <></>
}
