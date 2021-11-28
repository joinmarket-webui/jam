import { useState, useEffect } from 'react'
import { Route, Switch, Link } from 'react-router-dom'
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
import { getSession, clearSession } from '../session'

export default function App() {
  const [globalAlert, setGlobalAlert] = useGlobal('alert')
  const [makerStarted, setMakerStarted]  = useGlobal('makerStarted')
  const [currentWallet, setCurrentWallet] = useGlobal('currentWallet') // client
  const [activeWallet, setActiveWallet] = useGlobal('activeWallet') // server
  const [connection, setConnection] = useState()
  const [walletLoadStatus, setWalletLoadStatus] = useState()
  const [coinjoinInProcess, setCoinjoinInProcess] = useState()
  const [walletList, setWalletList] = useState([])

  useEffect(() => {
    setCurrentWallet(getSession())
  }, [setCurrentWallet])

  const resetState = async () => {
    setWalletList([])
    setActiveWallet(null)
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
      setActiveWallet(activeWallet)
      setMakerStarted(maker_running)
      setCoinjoinInProcess(coinjoin_in_process)
      setGlobalAlert(null)
      if (currentWallet && currentWallet.name !== activeWallet) {
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
      wallets.sort((a, b) => b === activeWallet)
      setWalletList(wallets)
    } catch (e) {
      setConnection(false)
      setWalletLoadStatus('No connection')
      setWalletList([])
    }
  }

  useEffect(() => { refreshWallets() }, [activeWallet])

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

  return (
    <div className="App">
      <rb.Navbar as="header" sticky="top" expand="md" bg="dark" variant="dark" collapseOnSelect>
        <rb.Container>
          <Link to="/" className="navbar-brand">JoinMarket</Link>
          <rb.Navbar.Toggle aria-controls="responsive-rb.Navbar-rb.Nav" className="ms-auto border-0" />
          <rb.Navbar.Collapse id="responsive-rb.Navbar-rb.Nav">
            <rb.Nav className="text-start">
              {currentWallet &&
                <>
                  <Link to="/wallets/current" className="nav-link">Wallet</Link>
                  <Link to="/payment" className="nav-link">Payment</Link>
                  <Link to="/receive" className="nav-link">Receive</Link>
                  <Link to="/maker" className="nav-link">Maker</Link>
                </>}
              {connection === true &&
                <Link to="/wallets/create" className="nav-link">Create Wallet</Link>}
              <Link to="/about" className="nav-link">About</Link>
            </rb.Nav>
          </rb.Navbar.Collapse>
          <div className="justify-content-start justify-content-md-end">
            <rb.Nav className="flex-row">
              <Link to="/" className="nav-link">{walletLoadStatus} ({activeWallet || 'None'} active)</Link>
              <rb.Navbar.Text>
                {connection === true &&
                  ` · YG ${makerStarted ? 'on' : 'off'}${coinjoinInProcess ? ', Coinjoining' : ''}`}
              </rb.Navbar.Text>
            </rb.Nav>
          </div>
        </rb.Container>
      </rb.Navbar>
      <rb.Container as="main" className="py-4">
        {connection === false &&
          <rb.Alert variant="danger">No connection to backend server.</rb.Alert>}
        <Switch>
          <Route path='/' exact render={props => (
            <Wallets currentWallet={currentWallet} activeWallet={activeWallet} walletList={walletList} onDisplay={displayWallet} />
          )} />
          {currentWallet &&
            <>
              <Route path='/wallets/current' exact render={props => (
                <CurrentWallet currentWallet={currentWallet} activeWallet={activeWallet} onSend={makePayment} listUTXOs={getUTXOs} />
              )} />
              <Route path='/wallets/create' exact render={props => (
                <CreateWallet currentWallet={currentWallet} activeWallet={activeWallet} />
              )} />
              <Route path='/payment' exact render={props => (
                <Payment currentWallet={currentWallet} onPayment={makePayment} onCoinjoin={doCoinjoin} />
              )} />
              <Route path='/maker' exact render={props => (
                <Maker onStart={startMakerService} onStop={stopMakerService} />
              )} />
              <Route path='/receive' exact render={props => (
                <Receive />
              )} />
            </>
          }
          <Route path='/about' exact render={props => (
            <About />
          )} />
        </Switch>
      </rb.Container>
    </div>
  )
}
