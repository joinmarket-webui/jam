import './App.css';
import { Button } from './components/Button';
import Wallet from './components/Wallet';
import {useState} from 'react'
function App() {

  // const [currWallet,setCurrWallet] = useState({})
  

  var wallet_1 = "jm_sig.jmdat";
  var wallet_2 = "test1.jmdat";
  var wallet_3 = "sig_3";

  
  const unlockWallet = async (name)=>{

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

    const lockWallet = async(name)=>{
      let authData =JSON.parse(localStorage.getItem('auth'));
      let token = "Bearer "+authData.token
      const res = await fetch(`/wallet/${name}/lock`,{
        method:"GET",
        headers:{
          'Authorization':token
        }
      });
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

  

  return (
    <div className="App">
      <h1>Display Wallet</h1>
      <ul>
        <li>{wallet_1}<Button onClick={unlockWallet} name ={wallet_1}>unlock</Button> <Button onClick={lockWallet} name ={wallet_1}>Lock</Button><Button onClick={displayWallet} name ={wallet_1}>Display</Button></li>
        <li>{wallet_2}<Button onClick={unlockWallet} name ={wallet_2}>unlock</Button> <Button onClick={lockWallet} name ={wallet_2}>Lock</Button><Button onClick={displayWallet} name ={wallet_1}>Display</Button></li>
        <li>{wallet_3}<Button onClick={unlockWallet} name ={wallet_3}>unlock</Button> <Button onClick={lockWallet} name ={wallet_3}>Lock</Button><Button onClick={displayWallet} name ={wallet_1}>Display</Button></li>
      </ul>
     
      
    </div>
  );
}

export default App;
