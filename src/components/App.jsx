import { useState, useEffect, useCallback } from 'react'
import { Route, Routes } from 'react-router-dom'
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

export default function App() {
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const setCurrentWalletInfo = useSetCurrentWalletInfo()
  const settings = useSettings()

  const [makerRunning, setMakerRunning] = useState()
  const [connectionError, setConnectionError] = useState()
  const [coinjoinInProcess, setCoinjoinInProcess] = useState()

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
      const opts = { signal: abortCtrl.signal }

      fetch('/api/v1/session', opts)
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

  return (
    <>
      <Navbar coinjoinInProcess={coinjoinInProcess} makerRunning={makerRunning} connectionError={connectionError} />
      <rb.Container as="main" className="py-5">
        {connectionError ? (
          <rb.Alert variant="danger">No connection to backend: {connectionError}.</rb.Alert>
        ) : (
          <Routes>
            <Route
              path="/"
              element={<Wallets currentWallet={currentWallet} startWallet={startWallet} stopWallet={stopWallet} />}
            />
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
                <Route path="send" element={<Send currentWallet={currentWallet} />} />
                <Route path="earn" element={<Earn currentWallet={currentWallet} makerRunning={makerRunning} />} />
                <Route path="receive" element={<Receive currentWallet={currentWallet} />} />
                <Route path="settings" element={<Settings currentWallet={currentWallet} />} />
              </>
            )}
          </Routes>
        )}
      </rb.Container>
      <rb.Nav as="footer" className="border-top py-2">
        <rb.Container>
          {connectionError ? (
            <div className="d-flex justify-content-center pt-2">
              <span className="text-danger mx-1">•</span>
              <span className="text-secondary">Disconnected</span>
            </div>
          ) : (
            <div className="d-flex justify-content-center pt-2">
              <span className="text-success mx-1">•</span>
              <span className="text-secondary">Connected</span>
            </div>
          )}
          <div className="d-flex justify-content-center">
            <rb.Nav.Item>
              <a
                href="https://github.com/JoinMarket-Org/joinmarket-clientserver/tree/master/docs"
                target="_blank"
                rel="noreferrer"
                className="nav-link text-secondary"
              >
                Docs
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://github.com/JoinMarket-Org/joinmarket-clientserver#wallet-features"
                target="_blank"
                rel="noreferrer"
                className="nav-link text-secondary"
              >
                Features
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://github.com/JoinMarket-Org/joinmarket-clientserver"
                target="_blank"
                rel="noreferrer"
                className="nav-link text-secondary"
              >
                GitHub
              </a>
            </rb.Nav.Item>
            <rb.Nav.Item>
              <a
                href="https://twitter.com/joinmarket"
                target="_blank"
                rel="noreferrer"
                className="nav-link text-secondary"
              >
                Twitter
              </a>
            </rb.Nav.Item>
          </div>
        </rb.Container>
      </rb.Nav>
    </>
  )
}
