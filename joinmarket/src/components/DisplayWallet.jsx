import React from 'react'
import {useState,useEffect} from 'react'
const DisplayWallet = ({onDisplay}) => {
    const [wallet_info,setWalletInfo] = useState([])

    // const name = JSON.parse(localStorage.getItem('auth').name)
    // console.log(name)
    // useEffect(()=>{
    //     const getWallets = async()=>{
    //       const wallets = await listWallets();
    //       console.log(wallets);
    //       setWalletList(wallets);
    //     }
    
    //     getWallets();
    //   },[])
    
    return (
        <div>
            Wallet Details
            
            
        </div>
    )
}

export default DisplayWallet
