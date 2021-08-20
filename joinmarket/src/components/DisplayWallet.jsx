import React from 'react'
import {useState,useEffect} from 'react'
const DisplayWallet = ({listWalletInfo}) => {
    const [wallet_info,setWalletInfo] = useState([])
    useEffect(()=>{
        //   const name = JSON.parse(localStorage.getItem('auth').name)
          const getWalletInfo = async()=>{
          const wallet_info = await listWalletInfo('test');
          console.log(wallet_info);
          setWalletInfo(wallet_info);
        }
    
        getWalletInfo();
      },[])
    
    return (
        <div>
            Wallet Details
            <p></p>
            {wallet_info.map((wallet,index)=>{
            return wallet[2]
        })}
            
            
        </div>
    )
}

export default DisplayWallet
