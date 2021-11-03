import './App.css'
import '@ibunker/bitcoin-react/dist/index.css'
import {useState,useEffect} from 'react'
import Wallets from './components/Wallets'
import Payment from './components/Payment'
import CreateWallet from './components/CreateWallet'
import Homepage from './components/homepage'
import Maker from './components/Maker'
import Receive from './components/Receive'
import DisplayWallet from './components/DisplayWallet'
import * as rb from 'react-bootstrap'
import github_logo from './github.svg'
import twitter_logo from './twitter.svg'
import useInterval from './components/utils'
import { BrowserRouter as Router, Route ,Switch} from 'react-router-dom'
import { useGlobal } from 'reactn'

function App() {
  const [walletList, setWalletList] = useState([])
  const [makerStarted, setmakerStarted]  = useGlobal('makerStarted')
  const [walletName, setWalletName] = useGlobal('walletName')
  const [coinjoinInProcess, setCoinjoinInProcess] = useGlobal('coinjoinInProcess')
  const [, setCurrentStatusMessage] = useGlobal('currentStatusMessage')

  const listWallets = async () =>{
    const res = await fetch('/api/v1/wallet/all')
    const data = await res.json()
    return data.wallets
  }

  const resetWalletSessionStorage = async () =>{
    sessionStorage.clear()
    setWalletName('No wallet loaded')
    setmakerStarted(false)
    setCoinjoinInProcess(false)
  }

  const getCurrentStatusMessage = () =>
    `Wallet: ${walletName}, YG ${makerStarted ? 'started' : 'not running'}, Coinjoin in process: ${coinjoinInProcess}`

  useInterval(() => {
    const sessionClear = async () => {
      try {
        const res = await fetch('/api/v1/session')
        const { session, maker_running, wallet_name, coinjoin_in_process } = await res.json()

        if (session === false) {
          console.log('no wallet in backend')
          // This status requires us to clear, especially
          // the auth state, so we just reset everything:
          return resetWalletSessionStorage()
        }

        setmakerStarted(maker_running)
        setWalletName(wallet_name)
        setCoinjoinInProcess(coinjoin_in_process)
        setCurrentStatusMessage(getCurrentStatusMessage())
      } catch(e) {
        console.error(e)
        alert('Lost connection to backend! Please restart the backend server.')
        sessionStorage.clear()
      }
    }
    sessionClear()
  }, 8*1000)

  useEffect(() => {
    const getWallets = async () => {
      const wallets = await listWallets()
      setWalletList(wallets)
    }
    getWallets()
  }, [])

  const unlockWallet = async (name) => {
    const authData = JSON.parse(sessionStorage.getItem('auth'))

    if (authData && authData.login) {
      return alert(authData.name === name
        // unlocking same wallet
        ? `${name} is already unlocked`
        // unlocking another wallet while one is already unlocked
        : `${authData.name} is currently in use, please lock it first`)
    } else {
      try {
        const password = prompt(`Enter the passphrase for ${name}`)
        const res = await fetch(`/api/v1/wallet/${name}/unlock`,{
          method: 'POST',
          headers: { 'Content-type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const data = await res.json()
        console.log(data)
        const token = data.token
        sessionStorage.setItem('auth', JSON.stringify({ login: true, token, name }))
      } catch (e) {
        console.error(e)
        alert('Something went wrong, please try again!')
      }
    }
  }

  const lockWallet = async (name) => {
    const authData = JSON.parse(sessionStorage.getItem('auth'))
    if (!authData || !authData.login || authData.name !== name) {
      return alert(`Please unlock ${name} first`)
    }

    try {
      const res = await fetch(`/api/v1/wallet/${name}/lock`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`
        }
      })
      sessionStorage.setItem('auth', JSON.stringify({
        login: false,
        token: '',
        name: ''
      }))
      const data = await res.json()
      console.log(data)
      alert('Wallet locked succesfully')
    } catch (e) {
      console.error(e)
      alert('Error while locking.')
    }
  }

  const listWalletInfo = async (name) => {
    const authData = JSON.parse(sessionStorage.getItem('auth'))
    const res = await fetch(`/api/v1/wallet/${name}/display`, {
      headers:{
        'Authorization': `Bearer ${authData.token}`
      }
    })
    const { walletinfo } = await res.json()
    const balance = walletinfo.total_balance
    const mix_depths = walletinfo.accounts
    const wallet_info = { balance }
    wallet_info[mix_depths[0].account] = mix_depths[0].account_balance
    wallet_info[mix_depths[1].account] = mix_depths[1].account_balance
    wallet_info[mix_depths[2].account] = mix_depths[2].account_balance
    wallet_info[mix_depths[3].account] = mix_depths[3].account_balance
    wallet_info[mix_depths[4].account] = mix_depths[4].account_balance

    return [walletinfo]
  }

  const displayWallet = async (name) => {
    const authData = JSON.parse(sessionStorage.getItem('auth'))
    if (!authData || !authData.login || authData.name !== name) {
      return alert(`Please unlock ${name} first`)
    }

    const res = await fetch(`/api/v1/wallet/${name}/display`, {
      headers:{
        'Authorization': `Bearer ${authData.token}`
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

  const createWallet = async (walletname, password) => {
    const authData = JSON.parse(sessionStorage.getItem('auth'))
    if (!authData || !authData.login) {
      try {
        const wallettype = 'sw'
        const res = await fetch(`/api/v1/wallet/create`, {
          method: 'POST',
          headers: { 'Content-type': 'application/json', },
          body: JSON.stringify({
            password,
            walletname,
            wallettype
          }),
        })

        const { seedphrase, token } = await res.json()
        alert('Wallet created succesfully')
        // TODO: figure out a safer way to show the seedphrase
        alert(seedphrase)
        sessionStorage.setItem('auth', JSON.stringify({ login: true, token, name: walletname }))
      } catch (e) {
        console.error(e)
        //some other error occurs where wallet is not created
        alert('Unexpected error! Please try again')
      }
    } else {
      alert(`${authData.name} is in use! Please lock it first.`)
    }
  }

  const makePayment = async (name, mixdepth, amount_sats,destination) => {
    const authData = JSON.parse(sessionStorage.getItem('auth'))
    if (authData && authData.login === true){
      try {
        const res = await fetch(`/api/v1/wallet/${name}/taker/direct-send`, {
          method:'POST',
          headers: {
            'Content-type': 'application/json',
            'Authorization': `Bearer ${authData.token}`
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
    try {
      const authData = JSON.parse(sessionStorage.getItem('auth'))
      if (!authData || !authData.login || authData.name === '') {
        return
      }

      const res = await fetch(`/api/v1/wallet/${authData.name}/taker/coinjoin`, {
        method:'POST',
        headers: {
          'Content-type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
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
    const authData =JSON.parse(sessionStorage.getItem('auth'))
    if (!authData || !authData.login || authData.name === ''){
      return alert('Please unlock a wallet first')
    }

    try {
      const res = await fetch(`/api/v1/wallet/${authData.name}/maker/start`, {
        method: 'POST',
        headers:{
          'Authorization': `Bearer ${authData.token}`
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
    const authData = JSON.parse(sessionStorage.getItem('auth'))
    if (!authData || !authData.login || authData.name === '') {
      return alert('Wallet needs to be unlocked')
    }

    try {
      const res = await fetch(`/api/v1/wallet/${authData.name}/maker/stop`, {
        headers:{
          'Authorization': `Bearer ${authData.token}`
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
    try {
      const authData = JSON.parse(sessionStorage.getItem('auth'))
      if (!authData || !authData.login || authData.name === '') {
        return
      }
      const res = await fetch(`/api/v1/wallet/${authData.name}/utxos`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`
        }
      })
      const { utxos } = await res.json()
      return utxos
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Router>
      <div className="App">
        <rb.Navbar sticky="top" collapseOnSelect expand="lg" bg="dark" variant="dark">
          <rb.Container>
            <rb.Navbar.Brand href='/'>Joinmarket</rb.Navbar.Brand>
            <rb.Navbar.Toggle aria-controls="responsive-rb.Navbar-rb.Nav" />
            <rb.Navbar.Collapse id="responsive-rb.Navbar-rb.Nav">
              <rb.Nav className="me-auto">
                <rb.Nav.Link href="https://github.com/JoinMarket-Org/joinmarket-clientserver/tree/master/docs">Docs</rb.Nav.Link>
                <rb.Nav.Link href="https://github.com/JoinMarket-Org/joinmarket-clientserver#wallet-features">Features</rb.Nav.Link>
                <rb.Nav.Link href="https://github.com/JoinMarket-Org/joinmarket-clientserver#joinmarket-clientserver">About</rb.Nav.Link>
              </rb.Nav>
              <rb.Nav>
                <rb.Navbar.Brand href="https://github.com/JoinMarket-Org/joinmarket-clientserver">
                  <img
                    src={github_logo}
                    width="50"
                    height="50"
                    className="github"
                    alt="github logo"
                  />
                </rb.Navbar.Brand>
                <rb.Navbar.Brand href="https://twitter.com/joinmarket">
                  <img
                    src={twitter_logo}
                    width="50"
                    height="50"
                    className="twitter"
                    alt="twitter logo"
                  />
                </rb.Navbar.Brand>
              </rb.Nav>
            </rb.Navbar.Collapse>
          </rb.Container>
          <rb.Container>
          <rb.Navbar.Text>
            {getCurrentStatusMessage()}
          </rb.Navbar.Text>
        </rb.Container>
      </rb.Navbar>
      <p></p>
      <Switch>
        <Route path='/' exact render={props => (
          <Homepage />
        )} />
        <Route path='/showWallets' exact render={props => (
            <Wallets walletList={walletList} currentWallet={walletName} onUnlock={unlockWallet} onLock={lockWallet} onDisplay={displayWallet} />
        )} />
        <Route path='/payment' exact render={props => (
          <Payment onPayment={makePayment} onCoinjoin={doCoinjoin} />
        )} />
        <Route path='/create' exact render={props => (
          <CreateWallet onCreate={createWallet} />
        )} />
        <Route path='/maker' exact render={props => (
          <Maker onStart={startMakerService} onStop={stopMakerService} />
        )} />
        <Route path='/receive' exact render={props => (
          <Receive />
        )} />
        <Route path='/display' exact render={props => (
          <DisplayWallet listWalletInfo={listWalletInfo} onSend={makePayment} listUTXOs={getUTXOs} />
        )} />
        </Switch>
      </div>
    </Router>
  )
}

export default App
