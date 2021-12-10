import { useState, useEffect, useRef } from 'react'
import { Route, Routes, Link } from 'react-router-dom'
import { useGlobal } from 'reactn'
import * as rb from 'react-bootstrap'
import Wallets from './Wallets'
import Payment from './Payment'
import CreateWallet from './CreateWallet'
import About from './About'
import Maker from './Maker'
import Receive from './Receive'
import CurrentWallet from './CurrentWallet'
import { useInterval } from '../utils'
import { getSession, setSession, clearSession } from '../session'

export default function App() {
  const [makerStarted, setMakerStarted]  = useGlobal('makerStarted')
  const [currentWallet, setCurrentWallet] = useGlobal('currentWallet') // client
  const [connection, setConnection] = useState()
  const [walletLoadStatus, setWalletLoadStatus] = useState()
  const [coinjoinInProcess, setCoinjoinInProcess] = useState()
  const [walletList, setWalletList] = useState([])
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

    websocket.current.onerror = error => {
      console.error('websocket error', error)
    }

    websocket.current.onmessage = event => {
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
    const session = getSession()
    if (session) {
      startWallet(session.name, session.token)
    }
  }, [])


  const resetState = async () => {
    setWalletList([])
    setCurrentWallet(null)
    setMakerStarted(null)
    setCoinjoinInProcess(null)
  }

  useInterval(async () => {
    try {
      const res = await fetch('/api/v1/session')
      const { maker_running, coinjoin_in_process, wallet_name } = await res.json()
      const activeWallet = wallet_name !== 'None' ? wallet_name : null

      setConnection(true)
      setMakerStarted(maker_running)
      setCoinjoinInProcess(coinjoin_in_process)
      if (activeWallet && currentWallet && currentWallet.name !== activeWallet) {
        setCurrentWallet(null)
        clearSession()
      }
    } catch (e) {
      setConnection(false)
      resetState()
    }
  }, 10000, true)

  const refreshWallets = async () => {
    try {
      setWalletLoadStatus('Fetching wallets')
      const res = await fetch('/api/v1/wallet/all')
      const { wallets = [] } = await res.json()
      setWalletLoadStatus(wallets.length === 0
        ? 'No wallets'
        : `${wallets.length} wallet${wallets.length === 1 ? '' : 's'}`)
      if (currentWallet) {
        wallets.sort((a, b) => b === currentWallet.name)
      }
      setWalletList(wallets)
    } catch (e) {
      setConnection(false)
      setWalletLoadStatus('No connection')
      setWalletList([])
    }
  }

  useEffect(() => { refreshWallets() }, [currentWallet])

  const displayWallet = async (walletName) => {
    const { name, token } = currentWallet
    if (!token) {
      return alert(`Please unlock ${walletName} first`)
    }

    const res = await fetch(`/api/v1/wallet/${name}/display`, {
      headers:{
        'Authorization': `Bearer ${token}`
      }
    })

    const { walletinfo } = await res.json()
    const balance = walletinfo.total_balance
    const mix_depths = walletinfo.accounts
    const wallet_info={}
    wallet_info['balance'] = balance
    wallet_info[mix_depths[0].account] = mix_depths[0].account_balance
    wallet_info[mix_depths[1].account] = mix_depths[1].account_balance
    wallet_info[mix_depths[2].account] = mix_depths[2].account_balance
    wallet_info[mix_depths[3].account] = mix_depths[3].account_balance
    wallet_info[mix_depths[4].account] = mix_depths[4].account_balance
    console.log(wallet_info)
    return wallet_info
  }

  const makePayment = async (_name, mixdepth, amount_sats, destination) => {
    const { name, token } = currentWallet
    if (token) {
      try {
        const res = await fetch(`/api/v1/wallet/${name}/taker/direct-send`, {
          method:'POST',
          headers: {
            'Content-type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            mixdepth,
            amount_sats,
            destination
          }),
        })
        const data = await res.json()
        console.log(data)
        alert('Payment Succesful!')
      } catch(e) {
        alert('Error while processing payment!')
      }
    } else {
      alert('please unlock wallet first')
    }
  }

  //route for frontend
  const doCoinjoin = async (mixdepth, amount, counterparties, destination) => {
    const { name, token } = currentWallet
    if (!token) return

    try {
      const res = await fetch(`/api/v1/wallet/${name}/taker/coinjoin`, {
        method:'POST',
        headers: {
          'Content-type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mixdepth,
          amount,
          counterparties,
          destination
        }),
      })
      const data = await res.json()
      console.log(data)
      alert('Coinjoin in Progress!')
    } catch (e) {
      console.error(e)
    }
  }

  const startMakerService = async (txfee, cjfee_a, cjfee_r, ordertype, minsize) => {
    const { name, token } = currentWallet
    if (!token) return alert('Please unlock a wallet first')

    try {
      const res = await fetch(`/api/v1/wallet/${name}/maker/start`, {
        method: 'POST',
        headers:{
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          txfee,
          cjfee_a,
          cjfee_r,
          ordertype,
          minsize
        })
      })

      const data = await res.json()
      console.log(data)
    } catch (e) {
      console.error(e)
      alert('Error while starting service!')
    }
  }

  const stopMakerService = async () => {
    const { name, token } = currentWallet
    if (!token) {
      return alert('Wallet needs to be unlocked')
    }

    try {
      const res = await fetch(`/api/v1/wallet/${name}/maker/stop`, {
        headers:{
          'Authorization': `Bearer ${token}`
        },
      })
      const data = await res.json()
      console.log(data)
      alert('Maker service stopped')
    } catch (e) {
      console.error(e)
      alert('Error while stopping service!')
    }
  }

  const getUTXOs = async () => {
    const { name, token } = currentWallet
    if (!token) return

    try {
      const res = await fetch(`/api/v1/wallet/${name}/utxos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const { utxos } = await res.json()
      return utxos
    } catch (e) {
      console.error(e)
    }
  }

  const nav = (
    <rb.Nav className="text-start">
      {currentWallet &&
        <>
          <Link to="/wallet" className="nav-link">Wallet</Link>
          <Link to="/payment" className="nav-link">Payment</Link>
          <Link to="/receive" className="nav-link">Receive</Link>
          <Link to="/maker" className="nav-link">Maker</Link>
        </>}
      {connection === true &&
        <Link to="/create-wallet" className="nav-link">Create Wallet</Link>}
      <Link to="/about" className="nav-link">About</Link>
    </rb.Nav>)

  return (
    <div className="App">
      <rb.Navbar as="header" sticky="top" expand="lg" bg="dark" variant="dark" collapseOnSelect>
        <rb.Container>
          <Link to="/" className="navbar-brand">JoinMarket</Link>
          <rb.Navbar.Toggle aria-controls="navbarOffcanvas" className="ms-auto border-0 order-sm-1" />
          <rb.Navbar className="d-none d-lg-flex">
            {nav}
          </rb.Navbar>
          <rb.Navbar.Offcanvas id="navbarOffcanvas">
            <rb.Offcanvas.Body>
              {nav}
            </rb.Offcanvas.Body>
          </rb.Navbar.Offcanvas>
          <rb.Nav className="ms-sm-auto d-block order-sm-0">
            <Link to="/" className="nav-link d-inline-block">{walletLoadStatus} ({(currentWallet && currentWallet.name) || 'None'} active)</Link>
            <rb.Navbar.Text>
              {connection === true &&
                ` · YG ${makerStarted ? 'on' : 'off'}${coinjoinInProcess ? ', Coinjoining' : ''}`}
            </rb.Navbar.Text>
          </rb.Nav>
        </rb.Container>
      </rb.Navbar>
      <rb.Container as="main" className="py-4">
        {connection === false &&
          <rb.Alert variant="danger">No connection to backend server.</rb.Alert>}
        <Routes>
          <Route path='/' element={<Wallets currentWallet={currentWallet} startWallet={startWallet} stopWallet={stopWallet} walletList={walletList} onDisplay={displayWallet} />} />
          <Route path='create-wallet' element={<CreateWallet currentWallet={currentWallet} startWallet={startWallet} />} />
          {currentWallet &&
            <>
              <Route path='wallet' element={<CurrentWallet currentWallet={currentWallet} onSend={makePayment} listUTXOs={getUTXOs} />} />
              <Route path='payment' element={<Payment currentWallet={currentWallet} onPayment={makePayment} onCoinjoin={doCoinjoin} />} />
              <Route path='maker' element={<Maker onStart={startMakerService} onStop={stopMakerService} />} />
              <Route path='receive' element={<Receive />} />
            </>
          }
          <Route path='about' element={<About />} />
        </Routes>
      </rb.Container>
    </div>
  )
}
