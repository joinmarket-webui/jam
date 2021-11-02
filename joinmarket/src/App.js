import './App.css';
import '@ibunker/bitcoin-react/dist/index.css';
import {useState,useEffect} from 'react'
import Wallets from './components/Wallets';
import Payment from './components/Payment';
import CreateWallet from './components/CreateWallet';
import Homepage from './components/homepage';
import Maker from './components/Maker';
import Receive from './components/Receive';
import DisplayWallet from './components/DisplayWallet'
import * as rb from 'react-bootstrap';
import github_logo from './github.svg'
import twitter_logo from './twitter.svg'
import useInterval from './components/utils'
import { BrowserRouter as Router, Route ,Switch} from 'react-router-dom';
import { useGlobal } from 'reactn';

function App() {
  const [walletList,setWalletList] = useState([])
  const [makerStarted, setmakerStarted]  = useGlobal("makerStarted");
  const [walletName, setWalletName] = useGlobal("walletName");
  const [coinjoinInProcess, setCoinjoinInProcess] = useGlobal("coinjoinInProcess");
  const [, setCurrentStatusMessage] = useGlobal("currentStatusMessage");

  const listWallets = async () =>{
    const res = await fetch('/api/v1/wallet/all');
    const data = await res.json();
    const walletList = data.wallets;
    return walletList;
  }
  const resetWalletSessionStorage = async () =>{
    sessionStorage.clear();
    setWalletName("No wallet loaded");
    setmakerStarted(false);
    setCoinjoinInProcess(false);
  }

  const getCurrentStatusMessage = () =>
    `Wallet: ${walletName}, YG ${makerStarted ? 'started' : 'not running'}, Coinjoin in process: ${coinjoinInProcess}`;

  useInterval(() => {
    const sessionClear = async () =>{
      try {
        const res = await fetch('/api/v1/session');
        const { session, maker_running, wallet_name, coinjoin_in_process } = await res.json();

        if (session === false) {
          console.log("no wallet in backend");
          // This status requires us to clear, especially
          // the auth state, so we just reset everything:
          return resetWalletSessionStorage();
        }

        setmakerStarted(maker_running);
        setWalletName(wallet_name);
        setCoinjoinInProcess(coinjoin_in_process);
        setCurrentStatusMessage(getCurrentStatusMessage());
      } catch(e) {
        console.error(e);
        alert("Lost connection to backend! Please restart the backend server.");
        sessionStorage.clear();
      }
    }
    sessionClear();

  }, 8*1000);

  useEffect(()=>{

    const getWallets = async()=>{
      const wallets = await listWallets();
      setWalletList(wallets);
    }

    getWallets();

  },[])


  const unlockWallet = async (name) => {
    const authData = JSON.parse(sessionStorage.getItem('auth'));

    if (authData && authData.login) {
      return alert(authData.name === name
        // unlocking same wallet
        ? `${name} is already unlocked`
        // unlocking another wallet while one is already unlocked
        : `${authData.name} is currently in use, please lock it first`);
    } else {
      try {
        const password = prompt(`Enter the passphrase for ${name}`);
        const res = await fetch(`/api/v1/wallet/${name}/unlock`,{
          method: 'POST',
          headers: { 'Content-type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        const data = await res.json();
        console.log(data)
        const token = data.token;
        sessionStorage.setItem('auth', JSON.stringify({ login: true, token, name }));
      } catch (e) {
        console.error(e);
        alert('Something went wrong, please try again!');
      }
    }
  }

    const lockWallet = async(name)=>{
      let authData =JSON.parse(sessionStorage.getItem('auth'));
      if(!authData || authData.login===false || authData.name!==name){
        alert("Please unlock "+name+" first")
        return;
      }

      try{
        let token = "Bearer "+authData.token
        const res = await fetch(`/api/v1/wallet/${name}/lock`,{
        method:"GET",
        headers:{
          'Authorization':token
        }
      });
      sessionStorage.setItem('auth',JSON.stringify({
        login:false,
        token:'',
        name:''

      }))
      const data = await res.json();
      console.log(data);
      alert("locked wallet succesfully")
      }
      catch(e){
        alert("Error while locking.")
      }
    }

    const listWalletInfo = async(name)=>{
      let authData =JSON.parse(sessionStorage.getItem('auth'));
      let token = "Bearer "+authData.token
      const res = await fetch(`/api/v1/wallet/${name}/display`,{
        method:"GET",
        headers:{
          'Authorization':token
        }
      });
      const { walletinfo } = await res.json();
      const balance = walletinfo.total_balance;
      const mix_depths = walletinfo.accounts;
      const wallet_info = { balance }
      wallet_info[mix_depths[0].account] = mix_depths[0].account_balance
      wallet_info[mix_depths[1].account] = mix_depths[1].account_balance
      wallet_info[mix_depths[2].account] = mix_depths[2].account_balance
      wallet_info[mix_depths[3].account] = mix_depths[3].account_balance
      wallet_info[mix_depths[4].account] = mix_depths[4].account_balance

      return [walletinfo];
    }

    const displayWallet = async(name)=>{

      let authData =JSON.parse(sessionStorage.getItem('auth'));
      if(authData.login===false || authData.name!==name){
        alert("Please unlock "+name+" first")
        return;
      }
      let token = "Bearer "+authData.token
      const res = await fetch(`/api/v1/wallet/${name}/display`,{
        method:"GET",
        headers:{
          'Authorization':token
        }
      });
      const { walletinfo } = await res.json();
      const balance = walletinfo.total_balance;
      const mix_depths = walletinfo.accounts;
      const wallet_info={}
      wallet_info['balance'] = balance;
      wallet_info[mix_depths[0].account] = mix_depths[0].account_balance
      wallet_info[mix_depths[1].account] = mix_depths[1].account_balance
      wallet_info[mix_depths[2].account] = mix_depths[2].account_balance
      wallet_info[mix_depths[3].account] = mix_depths[3].account_balance
      wallet_info[mix_depths[4].account] = mix_depths[4].account_balance
      console.log(wallet_info)
      return wallet_info;
    }

    const createWallet = async(name,password)=>{
      const authData = JSON.parse(sessionStorage.getItem('auth'));
      if (!authData || !authData.login) {
        try {
          const res = await fetch(`/api/v1/wallet/create`,{
            method:'POST',
            headers: { 'Content-type': 'application/json', },
            body: JSON.stringify({ password, "walletname": name, "wallettype":"sw" }),
          })

          const { seedphrase, token } = await res.json();
          alert("Wallet created succesfully")

          //figure out a safer way to show the seedphrase
          alert(seedphrase)
          sessionStorage.setItem('auth', JSON.stringify({ login: true, token, name }))
        } catch (e) {
          console.error(e);
          //some other error occurs where wallet is not created
          alert('Unexpected error! Please try again')
        }
      } else{
        alert(`${authData.name} is in use! Please lock it first.`)
      }
    }


    const makePayment = async(name,mixdepth,amountSats,destination)=>{
      let authData =JSON.parse(sessionStorage.getItem('auth'));
      if(authData!=null && authData.login===true){
        try{
          let token = "Bearer "+authData.token
          const res = await fetch(`/api/v1/wallet/${name}/taker/direct-send`,{
            method:'POST',
            headers: {
              'Content-type': 'application/json',
               'Authorization':token
            },
            body: JSON.stringify({
              "mixdepth": mixdepth,
              "amount_sats": amountSats,
              "destination": destination
              }

              ),
          })
          const data = await res.json();
          console.log(data);
          alert("Payment Succesful!")
        }
        catch(e){
          alert("Error while processing payment!")
        }


      }
      else{
        alert("please unlock wallet first")
      }
    }

    //route for frontend

    const doCoinjoin = async(mixdepth,amount,counterparties,destination)=>{
      try{
        console.log("hellooo")
        let authData = JSON.parse(sessionStorage.getItem('auth'));

        if(!authData|| authData.login===false || authData.name===''){
          return;
        }

        let token = "Bearer "+authData.token;
        let name = authData.name;
          const res = await fetch(`/api/v1/wallet/${name}/taker/coinjoin`,{
            method:'POST',
            headers: {
              'Content-type': 'application/json',
               'Authorization':token
            },
            body: JSON.stringify({

              "mixdepth": mixdepth,
              "amount": amount,
              "counterparties": counterparties,
              "destination":destination
              }

              ),
          })
          const data = await res.json();
          console.log(data);
          alert("Coinjoin in Progress!")

      }
      catch(e){
        return;
      }
    }

    const startMakerService = async(txfee,cjfee_a,cjfee_r,ordertype,minsize)=>{
      let authData =JSON.parse(sessionStorage.getItem('auth'));

      if(!authData|| authData.login===false || authData.name===''){
        alert("Please unlock a wallet first")
        return;
      }
      let name = authData.name
      try{
        let token = "Bearer "+authData.token
        const res = await fetch(`/api/v1/wallet/${name}/maker/start`,{
        method:"POST",
        headers:{
          'Authorization':token
        },
        body: JSON.stringify({
          "txfee":txfee,
          "cjfee_a":cjfee_a,
          "cjfee_r":cjfee_r,
          "ordertype":ordertype,
          "minsize":minsize
          }

          ),
      });

      const data = await res.json();
      console.log(data);
      }

      catch(e){
        alert("Error while starting service!")
      }

    }

    const stopMakerService= async()=>{
      let authData =JSON.parse(sessionStorage.getItem('auth'));
      if(authData===null ||authData.login===false || authData.name===''){
        alert('Wallet needs to be unlocked')
        return;
      }
      try{
        let name = authData.name
        let token = "Bearer "+authData.token
        const res = await fetch(`/api/v1/wallet/${name}/maker/stop`,{
          method:"GET",
          headers:{
            'Authorization':token
          },
        })
        const data = await res.json();
        console.log(data);
        alert("Maker service stopped")
        }

      catch(e){
        alert("Error while stopping service!")
      }
    }

    const getUTXOs = async()=>{
      try{
        let authData =JSON.parse(sessionStorage.getItem('auth'));
        let token = "Bearer "+authData.token
        if(!authData|| authData.login===false || authData.name===''){
          return;
        }
        let name = authData.name;
        const res = await fetch(`/api/v1/wallet/${name}/utxos`, {
          headers: { 'Authorization':token }
        });
        const { utxos } = await res.json();
        return utxos;
      } catch(e){
        return console.error(e);
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
    <rb.Navbar.Text>{getCurrentStatusMessage()}</rb.Navbar.Text>
  </rb.Container>
  </rb.Navbar>

      <p></p>
      <Switch>

      <Route
          path='/'
          exact
          render={(props) => (
            <>
             <Homepage></Homepage>
            </>
          )}
        />

      <Route
          path='/showWallets'
          exact
          render={(props) => (
            <>
             <Wallets walletList = {walletList} onUnlock = {unlockWallet} onLock = {lockWallet} onDisplay = {displayWallet}></Wallets>
            </>
          )}
        />


        <Route path='/payment' exact render={(props) => (
            <>
             <Payment onPayment = {makePayment} onCoinjoin = {doCoinjoin}></Payment>
            </>
          )}
        />

        <Route path='/create' exact render={(props) => (
            <>
             <CreateWallet onCreate={createWallet}></CreateWallet>
            </>
          )}
        />

        <Route path='/maker' exact render={(props) => (
            <>
             <Maker onStart = {startMakerService} onStop = {stopMakerService}></Maker>
            </>
          )}
        />
        <Route path='/receive' exact render={(props) => (
            <>
             <Receive></Receive>
            </>
          )}
        />
        <Route path='/display' exact render={(props) => (
            <>
             <DisplayWallet listWalletInfo = {listWalletInfo} onSend = {makePayment} listUTXOs={getUTXOs}></DisplayWallet>
            </>
          )}
        />

        </Switch>{" "}

    </div>
    </Router>


  );
}

export default App;
