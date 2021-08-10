import './App.css';
import { Button } from './components/Button';
import Wallet from './components/Wallet';
import {useState,useEffect} from 'react'
import Wallets from './components/Wallets';
import Payment from './components/Payment';
import CreateWallet from './components/CreateWallet';
import { BrowserRouter as Router, Link, Route ,Switch} from 'react-router-dom';
function App() {

  // const [currWallet,setCurrWallet] = useState({})
  const [walletList,setWalletList] = useState([])


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
    //if unlcoking same wallet
    if(authData && authData.login===true && authData.name===name){
      alert(name+" is aldready unlocked")
      return;
    }
    //if unlocking other wallet while one unlocked
    else if(authData && authData.login===true && authData.name!==name){
      alert(authData.name+" is currently in use,please lock it first");
      return;
    }

    else{
        try{
            var passphrase = prompt("Enter the passphrase for " + name);
            const res = await fetch(`/wallet/${name}/unlock`,{
            method:'POST',
            headers: {
              'Content-type': 'application/json',
            },
            body: JSON.stringify({"password": passphrase}),
          })
            const data = await res.json();
            console.log(data);
            const token = data[0].token;
            localStorage.setItem('auth',JSON.stringify({
              login:true,
              token:token,
              name:name
            }))
            alert("Succesfully unlocked!")
          }
        catch(e){
          alert("Something went wrong,please try again!")
        }
        
    }
  
    
    


    }

    const lockWallet = async(name)=>{
      let authData =JSON.parse(localStorage.getItem('auth'));
      if(authData.login===false || authData.name!==name){
        alert("Please unlock "+name+" first")
        return;
      }

      try{
        let token = "Bearer "+authData.token
        const res = await fetch(`/wallet/${name}/lock`,{
        method:"GET",
        headers:{
          'Authorization':token
        }
      });
      localStorage.setItem('auth',JSON.stringify({
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

    const displayWallet = async(name)=>{

      let authData =JSON.parse(localStorage.getItem('auth'));
      if(authData.login===false || authData.name!==name){
        alert("Please unlock "+name+" first")
        return;
      }
      let token = "Bearer "+authData.token
      const res = await fetch(`/wallet/${name}/display`,{
        method:"GET",
        headers:{
          'Authorization':token
        }
      });
      const data = await res.json();
      console.log(data[0].walletinfo);
      const wallet_name = name
      const balance = data[0].walletinfo.total_balance;
      const mix_depths = data[0].walletinfo.accounts;
      window.alert("Wallet Name: " + wallet_name + "\n" + "Total balance: " + balance);
      window.alert(mix_depths[0].account + " " + mix_depths[0].account_balance + "\n" + mix_depths[1].account + " " + mix_depths[1].account_balance + "\n" + mix_depths[2].account + " " + mix_depths[2].account_balance + "\n" + mix_depths[3].account + " " + mix_depths[3].account_balance + "\n" + mix_depths[4].account + " " + mix_depths[4].account_balance);
      
    }

    const createWallet = async(name,password)=>{
      let authData =JSON.parse(localStorage.getItem('auth'));
      if(authData===null || authData.login===false){
        try{
          const res = await fetch(`/wallet/create`,{
          method:'POST',
          headers: {
            'Content-type': 'application/json',
          },
          body: JSON.stringify({"password":password,"walletname":name,"wallettype":"sw"}),
        })
        alert("Wallet created,please restart the backend")
        }
      catch(e){
        //but what if some other error where wallet not created
        alert("UNexpected error!PLease try again")
      }
      }
      else{
        alert(authData.name +" is in use! Please lock it first.")
      }
      
    }


    const makePayment = async(name,mixdepth,amountSats,destination)=>{
      let authData =JSON.parse(localStorage.getItem('auth'));
      if(authData!=null && authData.login===true){
        try{
          const res = await fetch(`/wallet/${name}/taker/direct-send`,{
            method:'POST',
            headers: {
              'Content-type': 'application/json',
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

  

  return (
    <Router>
    <div className="App">
      
      <p></p>
      <Switch>
          
        
      
      <Route
          path='/'
          exact
          render={(props) => (
            <>
             <Wallets walletList = {walletList} onUnlock = {unlockWallet} onLock = {lockWallet} onDisplay = {displayWallet}></Wallets>
            </>
          )}
        />


        <Route path='/payment' exact render={(props) => (
            <>
             <Payment onPayment = {makePayment}></Payment>
            </>
          )}
        />
        
        <Route path='/create' exact render={(props) => (
            <>
             <CreateWallet onCreate={createWallet}></CreateWallet>
            </>
          )}
        />
     
        </Switch>{" "}
      
    </div>
    </Router>
    
    
  );
}

export default App;
