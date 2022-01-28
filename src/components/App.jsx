import { useState, useEffect, useRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import * as rb from 'react-bootstrap'
import Wallets from './Wallets'
import CreateWallet from './CreateWallet'
import Send from './Send'
import Earn from './Earn'
import Receive from './Receive'
import CurrentWallet from './CurrentWallet'
import Settings from './Settings'
import Navbar from './Navbar'
import { useCurrentWallet, useSetCurrentWallet } from '../context/WalletContext'
import { getSession, setSession, clearSession } from '../session'

export default function App() {
  const currentWallet = useCurrentWallet()
  const setCurrentWallet = useSetCurrentWallet()
  const [makerRunning, setMakerRunning] = useState()
  const [connectionError, setConnectionError] = useState()
  const [coinjoinInProcess, setCoinjoinInProcess] = useState()
  const websocket = useRef(null)

  const startWallet = (name, token) => {
    setSession(name, token)
    setCurrentWallet({ name, token })

    const { protocol, host } = window.location
    const scheme = protocol === 'https:' ? 'wss' : 'ws'
    websocket.current = new WebSocket(`${scheme}://${host}/ws/`)

    websocket.current.onopen = () => {
      console.debug('websocket connection openend')
      websocket.current.send(token)
    }

    websocket.current.onerror = (error) => {
      console.error('websocket error', error)
    }

    websocket.current.onmessage = (event) => {
      // For now we only have one message type, namely the transaction notification:
      // For now, note that since the `getUtxos` function is called on every render of
      // the display page, we don't need to somehow use this data other than as some
      // kind of popup/status bar notifier.
      // In future it might be possible to use the detailed transaction deserialization
      // passed in this notification, for something.
      const wsdata = JSON.parse(event.data)
      console.debug('websocket sent', wsdata)
    }

    const wsCurrent = websocket.current
    return () => {
      wsCurrent.close()
    }
  }

  const stopWallet = () => {
    clearSession()
    setCurrentWallet(null)

    if (websocket) {
      websocket.current.onclose = () => {
        console.debug('websocket connection closed')
      }
      websocket.current.close()
    }
  }

  useEffect(() => {
    const abortCtrl = new AbortController()

    const resetState = () => {
      setCurrentWallet(null)
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
  }, [currentWallet, setCurrentWallet])

  useEffect(() => {
    const session = getSession()
    if (session) {
      return startWallet(session.name, session.token)
    }
  }, [])

  return (
    <>
      <Navbar currentWallet={currentWallet} connectionError={connectionError} />
      <rb.Container as="main" className="py-4">
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
                <Route path="wallet" element={<CurrentWallet currentWallet={currentWallet} />} />
                <Route path="send" element={<Send currentWallet={currentWallet} />} />
                <Route
                  path="earn"
                  element={
                    <Earn
                      currentWallet={currentWallet}
                      makerRunning={makerRunning}
                      coinjoinInProcess={coinjoinInProcess}
                    />
                  }
                />
                <Route path="receive" element={<Receive currentWallet={currentWallet} />} />
                <Route path="settings" element={<Settings currentWallet={currentWallet} />} />
              </>
            )}
          </Routes>
        )}
      </rb.Container>
      <rb.Nav as="footer" className="border-top py-2">
        <rb.Container className="d-flex justify-content-center">
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
        </rb.Container>
      </rb.Nav>
    </>
  )
}
