import React from 'react'
import {useState,useEffect} from 'react'
import DisplayMixdepth from './DisplayMixdepth'
const DisplayWallet = ({listWalletInfo,onSend}) => {
    const [wallet_info,setWalletInfo] = useState([])
    useEffect(()=>{
          const name = JSON.parse(localStorage.getItem('auth')).name
          const getWalletInfo = async()=>{
          const wallet_info = await listWalletInfo(name);
          console.log(wallet_info);
          setWalletInfo(wallet_info);
        }
    
        getWalletInfo();
      },[])
    
    return (
        <div>
            Wallet Details
            <p></p>
            {wallet_info.map((walletInfo,index)=>{
                return <DisplayMixdepth key={index} walletInfo = {walletInfo}></DisplayMixdepth>
            })}
            
            
        </div>
    )
}

export default DisplayWallet
