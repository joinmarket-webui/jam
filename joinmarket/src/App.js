import './App.css';
import { Button } from './components/Button';
import Wallet from './components/Wallet';
import {useState,useEffect} from 'react'
import Wallets from './components/Wallets';
function App() {

  // const [currWallet,setCurrWallet] = useState({})
  const [walletList,setWalletList] = useState([])

  var wallet_1 = "jm_sig.jmdat";
  var wallet_2 = "test1.jmdat";
  var wallet_3 = "sig_3";

  const listWallets = async()=>{
    const res = await fetch('/wallet/all');
    const data = await res.json();
    const walletList = data[0].wallets;
    return walletList;
  }

  useEffect(()=>{
    const getWallets = async()=>{
      const wallets = await listWallets();
      console.log(wallets);
      setWalletList(wallets);
    }

    getWallets();
  },[])
 

  const unlockWallet = async (name)=>{
    let authData =JSON.parse(localStorage.getItem('auth'));
    console.log(authData)
    if(authData===null || authData.login===false){
      const res = await fetch(`/wallet/${name}/unlock`,{
        method:'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify({"password": "abhishek"}),
      })
      const data = await res.json();
      console.log(data);
      const token = data[0].token;
      localStorage.setItem('auth',JSON.stringify({
        login:true,
        token:token
      }))
    }
    


    }

    const lockWallet = async(name)=>{
      let authData =JSON.parse(localStorage.getItem('auth'));
      let token = "Bearer "+authData.token
      const res = await fetch(`/wallet/${name}/lock`,{
        method:"GET",
        headers:{
          'Authorization':token
        }
      });
      localStorage.setItem('auth',JSON.stringify({
        login:false,
        token:''
      }))
      const data = await res.json();
      console.log(data);
    }

    const displayWallet = async(name)=>{
      let authData =JSON.parse(localStorage.getItem('auth'));
      let token = "Bearer "+authData.token
      const res = await fetch(`/wallet/${name}/display`,{
        method:"GET",
        headers:{
          'Authorization':token
        }
      });
      const data = await res.json();
      console.log(data[0].walletinfo);
      
    }

    const createWallet = async(name,password)=>{

    }

  

  return (
    <div className="App">
      <h1>Display Wallet</h1>
      {/* <ul>
        <li>{wallet_1}<Button onClick={unlockWallet} name ={wallet_1}>unlock</Button> <Button onClick={lockWallet} name ={wallet_1}>Lock</Button><Button onClick={displayWallet} name ={wallet_1}>Display</Button></li>
        <li>{wallet_2}<Button onClick={unlockWallet} name ={wallet_2}>unlock</Button> <Button onClick={lockWallet} name ={wallet_2}>Lock</Button><Button onClick={displayWallet} name ={wallet_1}>Display</Button></li>
        <li>{wallet_3}<Button onClick={unlockWallet} name ={wallet_3}>unlock</Button> <Button onClick={lockWallet} name ={wallet_3}>Lock</Button><Button onClick={displayWallet} name ={wallet_1}>Display</Button></li>
      </ul> */}

      <Wallets walletList = {walletList} onUnlock = {unlockWallet} onLock = {lockWallet} onDisplay = {displayWallet}></Wallets>
     
      
    </div>
  );
}

export default App;
